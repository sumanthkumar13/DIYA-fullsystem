# # ---- Build stage ----
# FROM maven:3.9.6-eclipse-temurin-21 AS build
# WORKDIR /app
# COPY . .
# RUN mvn clean package -DskipTests

# # ---- Run stage ----
# FROM eclipse-temurin:21
# WORKDIR /app
# COPY --from=build /app/target/*.jar app.jar
# EXPOSE 8080
# ENTRYPOINT ["java", "-jar", "app.jar"]

# ---------- Stage 1: Build the application ----------
FROM maven:3.9.9-eclipse-temurin-17 AS builder

WORKDIR /app

# Copy pom first (for caching dependencies)
COPY pom.xml .
RUN mvn -B -q -e -DskipTests dependency:go-offline

# Copy source code
COPY src ./src

# Build jar
RUN mvn -B package -DskipTests

# ---------- Stage 2: Run the application ----------
FROM eclipse-temurin:17-jdk-jammy

WORKDIR /app

# Copy built jar from builder
COPY --from=builder /app/target/backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]