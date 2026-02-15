package com.benchmarktool.api.util.strategy;

import org.deckfour.xes.model.XLog;
import org.processmining.models.graphbased.directed.petrinet.Petrinet;
import org.processmining.models.semantics.petrinet.Marking;

/**
 * Input container for alignment computation.
 * Contains the log and either Petri net data OR process tree path.
 */
public class AlignmentInput {
    private final XLog log;
    
    // For Petri net algorithms (ILP, SplitPoint)
    private final Petrinet petriNet;
    private final Marking initialMarking;
    private final Marking[] finalMarkings;
    
    // For Process Tree algorithms
    private final String processTreePath;
    
    private AlignmentInput(Builder builder) {
        this.log = builder.log;
        this.petriNet = builder.petriNet;
        this.initialMarking = builder.initialMarking;
        this.finalMarkings = builder.finalMarkings;
        this.processTreePath = builder.processTreePath;
    }
    
    // Getters
    public XLog getLog() { return log; }
    public Petrinet getPetriNet() { return petriNet; }
    public Marking getInitialMarking() { return initialMarking; }
    public Marking[] getFinalMarkings() { return finalMarkings; }
    public String getProcessTreePath() { return processTreePath; }
    
    public boolean hasPetriNet() {
        return petriNet != null;
    }
    
    public boolean hasProcessTree() {
        return processTreePath != null && !processTreePath.isEmpty();
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private XLog log;
        private Petrinet petriNet;
        private Marking initialMarking;
        private Marking[] finalMarkings;
        private String processTreePath;
        
        public Builder log(XLog log) {
            this.log = log;
            return this;
        }
        
        public Builder petriNet(Petrinet petriNet, Marking initialMarking, Marking[] finalMarkings) {
            this.petriNet = petriNet;
            this.initialMarking = initialMarking;
            this.finalMarkings = finalMarkings;
            return this;
        }
        
        public Builder processTreePath(String path) {
            this.processTreePath = path;
            return this;
        }
        
        public AlignmentInput build() {
            if (log == null) {
                throw new IllegalStateException("Log is required");
            }
            return new AlignmentInput(this);
        }
    }
}
