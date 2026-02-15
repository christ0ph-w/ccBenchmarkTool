package com.benchmarktool.api.util.strategy;

import org.processmining.plugins.petrinet.replayresult.PNRepResult;
import com.benchmarktool.api.util.AlignmentComputationMWE;

import org.springframework.stereotype.Component;

@Component
public class ILPAlignmentStrategy implements AlignmentStrategy {

    @Override
    public ModelType getModelType() {
        return ModelType.PETRI_NET;
    }

    @Override
    public AlignmentResult computeAlignment(AlignmentInput input) throws Exception {
        if (! input.hasPetriNet()) {
            throw new IllegalArgumentException("ILP strategy requires a Petri net model");
        }

        long startTime = System.currentTimeMillis();

        // Call ProM
        PNRepResult promResult = AlignmentComputationMWE.computeAlignmentILPDefaultParam(
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
        return "ILP";
    }

    @Override
    public String getDescription() {
        return "Integer Linear Programming alignment - optimal but slower";
    }
}
