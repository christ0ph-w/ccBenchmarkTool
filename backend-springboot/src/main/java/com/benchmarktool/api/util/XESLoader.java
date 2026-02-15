package com.benchmarktool.api.util;

import org.deckfour.xes.in.XesXmlGZIPParser;
import org.deckfour.xes.in.XesXmlParser;
import org.deckfour.xes.model.XLog;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileInputStream;
import java.util.List;

@Component
public class XESLoader {

    public static XLog loadXES(String filePath) throws Exception {
        File xesFile = new File(filePath);
        return loadXES(xesFile);
    }

    public static XLog loadXES(File xesFile) throws Exception {
        try (FileInputStream fis = new FileInputStream(xesFile)) {
            // Check if file is GZIP compressed
            if (xesFile.getName().toLowerCase().endsWith(".gz")) {
                XesXmlGZIPParser parser = new XesXmlGZIPParser();
                if (parser.canParse(xesFile)) {
                    List<XLog> logs = parser.parse(xesFile);
                    if (logs != null && !logs.isEmpty()) {
                        return logs.get(0); // Return the first log in the file
                    }
                }
            } else {
                XesXmlParser parser = new XesXmlParser();
                if (parser.canParse(xesFile)) {
                    List<XLog> logs = parser.parse(xesFile);
                    if (logs != null && !logs.isEmpty()) {
                        return logs.get(0);
                    }
                }
            }
            throw new IllegalArgumentException("Failed to parse XES file: " + xesFile.getAbsolutePath());
        }
    }
}
