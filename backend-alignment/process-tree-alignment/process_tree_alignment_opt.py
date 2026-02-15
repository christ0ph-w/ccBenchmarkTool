from collections.abc import Hashable

import gurobipy as gp
from gurobipy import GRB
from pm4py.objects.log.obj import Trace

from process_tree_graph import ProcessTreeGraph


def align_multithreaded(trace: Trace,
                        process_tree_graph: ProcessTreeGraph,
                        env: gp.Env,
                        sync_arcs: list[tuple[Hashable, float]] | None = None,
                        log_arcs: list[dict[Hashable, float]] | None = None,
                        model_arcs: list[dict[Hashable, float]] | None = None,
                        ) -> tuple[float, list[tuple[Hashable, float]], list[dict[Hashable, float]], list[dict[Hashable, float]]]:
    if sync_arcs is not None and log_arcs is not None and model_arcs is not None:
        assert len(sync_arcs) == len(trace)
        assert len(log_arcs) == len(trace)
        assert len(model_arcs) == len(trace) + 1

    with gp.Model("process_tree_alignment", env=env) as m:
        # Flow variables including arc capacity constraints and objective function (minimize is default)
        x = m.addVars(len(trace) + 1, process_tree_graph.edges,
                      lb=0, ub={(i, *e): c for i in range(len(trace) + 1)
                                for *e, c in process_tree_graph.edges(keys=True, data='capacity')},
                      obj={(i, *e): c for i in range(len(trace) + 1)
                           for *e, c in process_tree_graph.edges(keys=True, data='cost')},
                      vtype=GRB.CONTINUOUS, name="x")
        y = m.addVars(range(1, len(trace) + 1), process_tree_graph.nodes,
                      lb=0, ub=1,
                      obj=1,
                      vtype=GRB.CONTINUOUS, name="y")
        sync_edges = {i+1: [e for e in process_tree_graph.edges
                            if process_tree_graph.edges.get(e).get('label') == a.get('concept:name')]
                      for i, a in enumerate(trace)}
        z = m.addVars([(i, *e) for i in sync_edges for e in sync_edges[i]],
                      lb=0, ub={(i, *e): process_tree_graph.edges.get(e).get('capacity') for i in sync_edges
                                for e in sync_edges[i]},
                      obj={(i, *e): 1 - cost if (cost := process_tree_graph.edges.get(e).get('cost')) > 1 else 0
                           for i in sync_edges for e in sync_edges[i]},
                      vtype=GRB.CONTINUOUS, name="z")

        # Flow conservation constraints
        if len(trace) == 0:
            m.addConstrs(x.sum(0, '*', v, '*') - x.sum(0, v, '*', '*')
                         == (0 if process_tree_graph.nodes.get(v).get('source')
                                  == process_tree_graph.nodes.get(v).get('sink')
                             else -1 if process_tree_graph.nodes.get(v).get('source') else 1)
                         for v in process_tree_graph.nodes)
        else:
            m.addConstrs(x.sum(i, '*', v, '*')
                         + (y[i, v] + z.sum(i, '*', v, '*') if i > 0 else 0)
                         - x.sum(i, v, '*', '*')
                         - (y[i + 1, v] + z.sum(i + 1, v, '*', '*') if i < len(trace) else 0)
                         == (-1 if i == 0 and process_tree_graph.nodes.get(v).get('source')
                             else 1 if i == len(trace) and process_tree_graph.nodes.get(v).get('sink') else 0)
                         for i in range(len(trace) + 1) for v in process_tree_graph.nodes)

        # Synchronization variables and constraints
        shuffles = {(k, i): w for k, v in process_tree_graph.nodes._nodes.items() if v.get('shuffle') for i, w in
                    enumerate(v['shuffle'])}
        s = m.addVars(len(trace) + 1, shuffles.keys(), vtype=GRB.BINARY, name="s")
        m.addConstrs(gp.quicksum(x[(i, *e)] for e in shuffles[(v, j)])
                     == s[(i, v, j)] / process_tree_graph.nodes.get(v)['iac']
                     for v, j in shuffles
                     for i in range(len(trace)+1))

        # Duplicate labels constraints
        m.addConstrs(gp.quicksum(z[(i, *e)] * process_tree_graph.edges.get(e).get('cost') for e in sync_edges[i]) <= 1
                     for i in sync_edges if len(sync_edges[i]) > 1)

        # Provide warm start vector
        if sync_arcs is not None and log_arcs is not None and model_arcs is not None:
            for i in range(len(trace) + 1):
                for k in shuffles:
                    s[(i, *k)].Start = 0.
            for i in sync_edges:
                for e in sync_edges[i]:
                    z[(i, *e)].Start = 0.
            for i in range(1, len(trace) + 1):
                for n in process_tree_graph.nodes:
                    y[i, n].Start = 0.
            for i in range(len(trace) + 1):
                for e in process_tree_graph.edges:
                    x[(i, *e)].Start = 0.
            for i, sync_arc_at_i in enumerate(sync_arcs):
                if sync_arc_at_i is not None:
                    sync_arc, val = sync_arc_at_i
                    z[(i + 1, *sync_arc)].Start = val
            for i, log_arcs_at_i in enumerate(log_arcs):
                for log_arc, val in log_arcs_at_i.items():
                    y[(i + 1, log_arc)].Start = val
            for i, model_arcs_at_i in enumerate(model_arcs):
                for model_arc, val in model_arcs_at_i.items():
                    x[(i, *model_arc)].Start = val
                    for k, v in shuffles.items():
                        if model_arc in v:
                            s[(i, *k)].Start = 1.
                            break

        m.optimize()

        if m.status == GRB.OPTIMAL:
            # Provide alignment information as a triplet composed of
            #  - a list of synchronous arcs used,
            #  - a list of sets of log arcs used, and
            #  - a list of sets of model arcs used.
            sync_arcs_used = []
            log_arcs_used = []
            model_arcs_used = []
            for i in range(1, len(trace) + 1):
                sync_arc_used_at_i = None
                if i in sync_edges:
                    for e in sync_edges[i]:
                        if 2 * (val := z[(i, *e)].X) > process_tree_graph.edges.get(e).get('capacity'):
                            sync_arc_used_at_i = e, val
                            break
                sync_arcs_used.append(sync_arc_used_at_i)
                log_arcs_used_at_i = {}
                for n in process_tree_graph.nodes:
                    if len(incident_edges := process_tree_graph.edges(n, data='capacity')) == 0:
                        incident_edges = process_tree_graph.in_edges(n, data='capacity')
                    if 2 * (val := y[(i, n)].X) > next(iter(incident_edges))[2]:
                        log_arcs_used_at_i[n] = val
                log_arcs_used.append(log_arcs_used_at_i)
            for i in range(len(trace) + 1):
                model_arcs_used_at_i = {}
                for e in process_tree_graph.edges:
                    if 2 * (val := x[(i, *e)].X) > process_tree_graph.edges.get(e).get('capacity'):
                        model_arcs_used_at_i[e] = val
                model_arcs_used.append(model_arcs_used_at_i)

            return m.objVal, sync_arcs_used, log_arcs_used, model_arcs_used

        raise Exception(f"Optimization failed with status {m.status}")


def insert_move(process_tree_graph: ProcessTreeGraph,
                sync_arcs_used: list[tuple[Hashable, float]],
                log_arcs_used: list[dict[Hashable, float]],
                model_arcs_used: list[dict[Hashable, float]],
                position: int,
                ) -> tuple[list[tuple[Hashable, float]], list[dict[Hashable, float]], list[dict[Hashable, float]]]:
    assert len(sync_arcs_used) == len(log_arcs_used) == len(model_arcs_used) - 1
    assert 0 <= position <= len(sync_arcs_used)
    flow_at_nodes = {n: 0. for n in process_tree_graph.nodes}
    flow_at_nodes[0] = 1.
    for model_arc, flow in model_arcs_used[0].items():
        flow_at_nodes[model_arc[0]] -= flow
        flow_at_nodes[model_arc[1]] += flow
    for i in range(position):
        if sync_arcs_used[i] is not None:
            sync_arc, flow = sync_arcs_used[i]
            flow_at_nodes[sync_arc[0]] -= flow
            flow_at_nodes[sync_arc[1]] += flow
        for model_arc, flow in model_arcs_used[i + 1].items():
            flow_at_nodes[model_arc[0]] -= flow
            flow_at_nodes[model_arc[1]] += flow
    sync_arcs_used.insert(position, None)
    log_arcs_used.insert(position, {n: f for n, f in flow_at_nodes.items() if f > 0.})
    model_arcs_used.insert(position, {})
    return sync_arcs_used, log_arcs_used, model_arcs_used


def delete_move(sync_arcs_used: list[tuple[Hashable, float]],
                log_arcs_used: list[dict[Hashable, float]],
                model_arcs_used: list[dict[Hashable, float]],
                position: int,
                ) -> tuple[list[tuple[Hashable, float]], list[dict[Hashable, float]], list[dict[Hashable, float]]]:
    assert len(sync_arcs_used) == len(log_arcs_used) == len(model_arcs_used) - 1
    assert 0 <= position < len(sync_arcs_used)
    sync_arc = sync_arcs_used.pop(position)
    if sync_arc is not None:
        sync_arc, flow = sync_arc
        if sync_arc in model_arcs_used[position]:
            model_arcs_used[position][sync_arc] += flow
        else:
            model_arcs_used[position][sync_arc] = flow
    log_arcs_used.pop(position)
    model_arcs = model_arcs_used.pop(position + 1)
    for model_arc, flow in model_arcs.items():
        if model_arc in model_arcs_used[position]:
            model_arcs_used[position][model_arc] += flow
        else:
            model_arcs_used[position][model_arc] = flow
    return sync_arcs_used, log_arcs_used, model_arcs_used


def align(trace: Trace,
          process_tree_graph: ProcessTreeGraph,
          sync_arcs: list[tuple[Hashable, float]] | None = None,
          log_arcs: list[dict[Hashable, float]] | None = None,
          model_arcs: list[dict[Hashable, float]] | None = None,
          ) -> tuple[float, list[tuple[Hashable, float]], list[dict[Hashable, float]], list[dict[Hashable, float]]]:
    if sync_arcs is not None and log_arcs is not None and model_arcs is not None:
        assert len(sync_arcs) == len(trace)
        assert len(log_arcs) == len(trace)
        assert len(model_arcs) == len(trace) + 1

    with gp.Env(empty=True) as env:
        env.setParam('OutputFlag', 0)
        env.start()
        if sync_arcs is not None and log_arcs is not None and model_arcs is not None:
            return align_multithreaded(trace, process_tree_graph, env, sync_arcs, log_arcs, model_arcs)
        return align_multithreaded(trace, process_tree_graph, env)
