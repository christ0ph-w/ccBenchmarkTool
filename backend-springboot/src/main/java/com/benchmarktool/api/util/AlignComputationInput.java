package com.benchmarktool.api.util;

import org.deckfour.xes.model.XLog;
import org.processmining.models.graphbased.directed.petrinet.Petrinet;
import org.processmining.plugins.connectionfactories.logpetrinet.TransEvClassMapping;
import org.processmining.plugins.petrinet.replayer.algorithms.costbasedcomplete.CostBasedCompleteParam;

public record AlignComputationInput(
    Petrinet pn, 
    XLog log,
    TransEvClassMapping transEvMapping, 
    CostBasedCompleteParam param
) {}