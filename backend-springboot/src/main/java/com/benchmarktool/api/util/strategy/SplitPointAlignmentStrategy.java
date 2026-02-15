package com.benchmarktool.api.util.strategy;

import org.processmining.plugins.petrinet.replayresult.PNRepResult;
import com.benchmarktool.api.util.AlignmentComputationMWE;

import org.springframework.stereotype.Component;

@Component
public class SplitPointAlignmentStrategy implements AlignmentStrategy {

    @Override
    public ModelType getModelType() {
        return ModelType.PETRI_NET;
    }

    @Override
    public AlignmentResult computeAlignment(AlignmentInput input) throws Exception {
        if (! input.hasPetriNet()) {
            throw new IllegalArgumentException("SplitPoint strategy requires a Petri net model");
        }

        long startTime = System.currentTimeMillis();

        // Call ProM
        PNRepResult promResult = AlignmentComputationMWE.computeAlignmentSplitPointDefaultParam(
            input.getLog(),
            input.getPetriNet(),
            input.getInitialMarking(),
            input.getFinalMarkings()
        );

        long executionTime = System.currentTimeMillis() - startTime;

        // Convert ProM result to unified format with per-variant details
        return PromResultConverter.convert(promResult, input.getLog(), executionTime);
    }

    @Override
    public String getName() {
        return "SPLITPOINT";
    }

    @Override
    public String getDescription() {
        return "Split-point alignment - faster heuristic approach";
    }
}
