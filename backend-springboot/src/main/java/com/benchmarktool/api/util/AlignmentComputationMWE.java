package com.benchmarktool.api.util;

import org.deckfour.xes.classification.XEventClass;
import org.deckfour.xes.classification.XEventClasses;
import org.deckfour.xes.info.XLogInfo;
import org.deckfour.xes.info.XLogInfoFactory;
import org.deckfour.xes.info.impl.XLogInfoImpl;
import org.deckfour.xes.model.XLog;
import org.processmining.alignment.plugin.IterativeAStarPlugin;
import org.processmining.models.graphbased.directed.petrinet.Petrinet;
import org.processmining.models.semantics.petrinet.Marking;
import org.processmining.plugins.astar.petrinet.PetrinetReplayerWithILP;
import org.processmining.plugins.connectionfactories.logpetrinet.TransEvClassMapping;
import org.processmining.plugins.petrinet.replayer.PNLogReplayer;
import org.processmining.plugins.petrinet.replayer.algorithms.IPNReplayAlgorithm;
import org.processmining.plugins.petrinet.replayer.algorithms.costbasedcomplete.CostBasedCompleteParam;
import org.processmining.plugins.petrinet.replayresult.PNRepResult;

import nl.tue.astar.AStarException;

public class AlignmentComputationMWE {

	/**
	 * Compute an alignment using ILP approach and default parameterization {@link this#createAlignComputationInputDefaultParam(XLog, Petrinet, Marking, Marking[])}.
	 *
	 * @param log            Event log
	 * @param pn             Petri net
	 * @param initialMarking Initial marking of the Petri net
	 * @param finalMarkings  Admissible final markings
	 * @return Replay result aka alignment
	 * @throws AStarException
	 */
	public static PNRepResult computeAlignmentILPDefaultParam(XLog log, Petrinet pn,
			Marking initialMarking, Marking[] finalMarkings) throws AStarException {
		AlignComputationInput alignSpec = createAlignComputationInputDefaultParam(log, pn, initialMarking,
				finalMarkings);
		return computeAlignmentILP(alignSpec.log(), alignSpec.pn(), alignSpec.transEvMapping(), alignSpec.param());
	}

	/**
	 * Compute an alignment using Split Point-Based approach and default parameterization {@link this#createAlignComputationInputDefaultParam(XLog, Petrinet, Marking, Marking[])}.
	 *
	 * @param log            Event log
	 * @param pn             Petri net
	 * @param initialMarking Initial marking of the Petri net
	 * @param finalMarkings  Admissible final markings
	 * @return Replay result aka alignment
	 * @throws AStarException
	 */
	public static PNRepResult computeAlignmentSplitPointDefaultParam(XLog log, Petrinet pn,
			Marking initialMarking, Marking[] finalMarkings) throws AStarException {
		AlignComputationInput alignSpec = createAlignComputationInputDefaultParam(log, pn, initialMarking,
				finalMarkings);
		return computeAlignmentSplitPoint(alignSpec.log(), alignSpec.pn(), alignSpec.transEvMapping(), alignSpec.param());
	}

	/**
	 * Prepares the standard input used by most alignment computation methods  using default parameterization: <p> <ul> <li> Map
	 * transition to activities based on activity names</li> <li> Unit costs
	 * (non-synchronous: 1, silent: 0, synchronous: 0)</li> </ul>
	 *
	 * @param log            Event log
	 * @param pn             Petri net
	 * @param initialMarking Initial marking of the Petri net
	 * @param finalMarkings  Admissible final markings
	 * @return Replay result aka alignment
	 */
	public static AlignComputationInput createAlignComputationInputDefaultParam(XLog log, Petrinet pn,
			Marking initialMarking, Marking[] finalMarkings) {

		// Derive Log Information - Event classes
		XLogInfo logInfo = XLogInfoFactory.createLogInfo(log, XLogInfoImpl.NAME_CLASSIFIER);
		XEventClasses eventClasses = logInfo.getEventClasses();
		// Dummy event class for mapping silent transitions
		XEventClass dummy = new XEventClass("", 1);

		// Main arguments of alignment computation
		// Mapping: Transition -> Event Class
		TransEvClassMapping transEvMapping = PNLogConnector.instantiateTransEventMappingEqualName(eventClasses, dummy,
				pn);
		// Costs
		CostBasedCompleteParam param = initDefaultCostParameterization(eventClasses, dummy, pn,
				initialMarking, finalMarkings);

		return new AlignComputationInput(pn, log, transEvMapping, param);

	}

	/**
	 * Run the actual alignment computation using Search with ILP Heuristic
	 *
	 * @param log            Log
	 * @param pn             Petri net
	 * @param transEvMapping Mapping Transition -> Event classes
	 * @param param          Cost parameterization for the alignment
	 * @return Replay result of the Petri net aka alignment
	 * @throws AStarException
	 */
	public static PNRepResult computeAlignmentILP(XLog log, Petrinet pn,
			TransEvClassMapping transEvMapping, CostBasedCompleteParam param) throws AStarException {
		IPNReplayAlgorithm alg = null;
		PNLogReplayer replayer = new PNLogReplayer();
		alg = new PetrinetReplayerWithILP();

		// In current implementation, method does not access context
		PNRepResult resReplay = replayer.replayLog(null, pn, log, transEvMapping, alg, param);

		return resReplay;
	}

	/**
	 * Run the actual alignment computation using Split Point-Based Alignment Computation
	 *
	 * @param log            Log
	 * @param pn             Petri net
	 * @param transEvMapping Mapping Transition -> Event classes
	 * @param param          Cost parameterization for the alignment
	 * @return Replay result of the Petri net aka alignment
	 * @throws AStarException
	 */
	public static PNRepResult computeAlignmentSplitPoint(XLog log, Petrinet pn,
			TransEvClassMapping transEvMapping, CostBasedCompleteParam param) throws AStarException {

		IterativeAStarPlugin alignPlugin = new IterativeAStarPlugin();
		return alignPlugin.replayLog(new DummyConsolePluginContext(), pn, log, transEvMapping, param);
	}


	/**
	 * Default cost configuration for alignments with unit costs for non-synchronous
	 * moves
	 *
	 * @param eventClasses   Event classes (potential log moves)
	 * @param dummy          Dummy event class used for <b>silent</b> transitions
	 * @param pn             Petri net
	 * @param initialMarking Initial marking
	 * @param finalMarkings  Final markings
	 * @return Cost parameterization for the alignment computation
	 */
	public static CostBasedCompleteParam initDefaultCostParameterization(XEventClasses eventClasses,
			XEventClass dummy, Petrinet pn, Marking initialMarking, Marking[] finalMarkings) {
		CostBasedCompleteParam costBasedCompParam = new CostBasedCompleteParam(
				eventClasses.getClasses(), dummy, pn.getTransitions(), 1, 1);
		costBasedCompParam.setInitialMarking(initialMarking);
		costBasedCompParam.setFinalMarkings(finalMarkings);
		costBasedCompParam.setCreateConn(false);
		costBasedCompParam.setGUIMode(false);

		return costBasedCompParam;

	}
}
