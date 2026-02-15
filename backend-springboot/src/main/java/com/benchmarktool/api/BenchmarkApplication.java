package com.benchmarktool.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;


@SpringBootApplication
public class BenchmarkApplication {

	public static void main(String[] args) {
		SpringApplication.run(BenchmarkApplication.class, args);
		System.out.println("\nBenchmark API started");
		System.out.println("Available at: http://localhost:8080/api");
	}
}

