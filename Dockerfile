FROM node:22-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_YANDEX_MAPS_KEY
ENV VITE_YANDEX_MAPS_KEY=$VITE_YANDEX_MAPS_KEY
RUN npm run build

FROM maven:3.9-eclipse-temurin-21-alpine AS backend
WORKDIR /be
COPY backend/pom.xml ./
COPY backend/src ./src
COPY --from=frontend /fe/dist/ src/main/resources/static/
RUN mvn -q -DskipTests package && cp target/map-0.0.1-SNAPSHOT.jar /be/app.jar

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app && mkdir -p /data/uploads && chown -R app:app /data
COPY --from=backend /be/app.jar app.jar
USER app
ENV JAVA_OPTS="-XX:MaxRAMPercentage=70 -XX:+UseG1GC -XX:TieredStopAtLevel=1 -Dspring.jmx.enabled=false"
ENV UPLOAD_DIR=/data/uploads
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
