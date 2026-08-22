package com.eva.map.config;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String raw = first(environment, "SPRING_DATASOURCE_URL", "DATABASE_URL", "spring.datasource.url");
        if (raw == null || raw.startsWith("jdbc:")) {
            return;
        }
        if (!raw.startsWith("postgres://") && !raw.startsWith("postgresql://")) {
            return;
        }
        URI uri = URI.create(raw);
        String userInfo = uri.getUserInfo();
        if (userInfo == null || !userInfo.contains(":")) {
            return;
        }
        int split = userInfo.indexOf(':');
        String user = userInfo.substring(0, split);
        String password = userInfo.substring(split + 1);
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String query = uri.getQuery();
        String jdbc = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getPath()
                + (query == null || query.isBlank() ? "?sslmode=require" : "?" + query);
        Map<String, Object> props = new HashMap<>();
        props.put("spring.datasource.url", jdbc);
        props.put("spring.datasource.username", user);
        props.put("spring.datasource.password", password);
        environment.getPropertySources().addFirst(new MapPropertySource("databaseUrl", props));
    }

    private static String first(ConfigurableEnvironment environment, String... keys) {
        for (String key : keys) {
            String value = environment.getProperty(key);
            if (value != null && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
