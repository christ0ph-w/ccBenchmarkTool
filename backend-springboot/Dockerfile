FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /app

# Copy Gradle files
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Make gradlew executable and download dependencies
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# Copy source code and libs
COPY src src
COPY lib lib

# Build
RUN ./gradlew bootJar --no-daemon

# Runtime image
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar
COPY --from=builder /app/lib lib

ENV JAVA_OPTS="-Xmx8g -Xms4g -Djava.library.path=/app/lib"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]