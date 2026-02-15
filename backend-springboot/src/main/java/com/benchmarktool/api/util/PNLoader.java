package com.benchmarktool.api.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Collection;
import java.util.HashSet;

import org.processmining.models.connections.GraphLayoutConnection;
import org.processmining.models.graphbased.directed.petrinet.Petrinet;
import org.processmining.models.graphbased.directed.petrinet.elements.Place;
import org.processmining.models.graphbased.directed.petrinet.impl.PetrinetFactory;
import org.processmining.models.semantics.petrinet.Marking;
import org.processmining.plugins.pnml.base.Pnml;
import org.processmining.plugins.pnml.importing.PnmlImportUtils;
import org.springframework.stereotype.Component;

@Component
public class PNLoader {
    /**
     * Load the Petri net from the provided file path.
     */
    public static Object[] loadWorkflowPetriNet(String filePath) throws Exception {
        File pnFile = new File(filePath);
        return loadWorkflowPetriNet(pnFile);
    }

    /**
     * Load the Petri net from the provided file.
     */
    public static Object[] loadWorkflowPetriNet(File pnFile) throws Exception {
        try (InputStream pnInputStream = new FileInputStream(pnFile)) {
            return loadWorkflowPetriNet(pnInputStream);
        }
    }

    /**
     * Load the Petri net from the provided input stream.
     * Returns [Petri net, initial marking, final marking]
     */
    public static Object[] loadWorkflowPetriNet(InputStream pnInputStream) throws Exception {
        PnmlImportUtils inpUtil = new PnmlImportUtils();
        
        // Import PNML from stream
        Pnml pnml = inpUtil.importPnmlFromStream(null, pnInputStream, null, 0);
        Petrinet pn = PetrinetFactory.newPetrinet(pnml.getLabel());

        // Create fresh marking(s) and layout
        Marking marking = new Marking();
        Collection<Marking> fm = new HashSet<Marking>();
        GraphLayoutConnection layout = new GraphLayoutConnection(pn);

        // Initialize the Petri net, marking(s), and layout from the PNML element
        pnml.convertToNet(pn, marking, fm, layout);

        // Find source and sink places for workflow net
        Place source = null;
        Place sink = null;
        for (Place p : pn.getPlaces()) {
            if (pn.getInEdges(p).isEmpty()) {
                source = p;
            } else if (pn.getOutEdges(p).isEmpty()) {
                sink = p;
            }
        }

        // Initial Marking
        Marking initMarking = new Marking();
        if (source != null) {
            initMarking.add(source);
        }

        // Final Marking
        Marking[] finalMarkings = new Marking[1];
        Marking finalMarking = new Marking();
        if (sink != null) {
            finalMarking.add(sink);
        }
        finalMarkings[0] = finalMarking;

        Object[] result = new Object[3];
        result[0] = pn;
        result[1] = initMarking;
        result[2] = finalMarkings;
        
        return result;
    }
}