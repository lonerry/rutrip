package com.eva.map.auth;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final String HTML_TEMPLATE;

    static {
        try (var in = MailService.class.getResourceAsStream("/mail/password-reset.html")) {
            if (in == null) throw new IllegalStateException("Нет шаблона mail/password-reset.html");
            HTML_TEMPLATE = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new ExceptionInInitializerError(ex);
        }
    }

    private final JavaMailSender mailSender;
    private final String from;
    private final String publicUrl;
    private final boolean enabled;

    public MailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String host,
            @Value("${app.mail.from}") String from,
            @Value("${app.public-url}") String publicUrl
    ) {
        this.mailSender = mailSender.getIfAvailable();
        this.from = from;
        this.publicUrl = publicUrl == null ? "" : publicUrl.replaceAll("/+$", "");
        this.enabled = this.mailSender != null && host != null && !host.isBlank();
    }

    public void sendPasswordReset(String to, String displayName, String link) {
        String greeting = greeting(displayName);
        String plain = """
                %s

                Чтобы задать новый пароль в Rutrip, открой ссылку:
                %s

                Ссылка действует 1 час. Если ты не просил сброс — просто проигнорируй письмо.
                """.formatted(greeting, link);
        String html = HTML_TEMPLATE
                .replace("{{GREETING}}", escape(greeting))
                .replace("{{LINK}}", escape(link))
                .replace("{{HOME}}", escape(publicUrl.isBlank() ? link : publicUrl));

        if (!enabled) {
            log.info("Письмо сброса пароля для {} (SMTP не настроен): {}", to, link);
            return;
        }

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Сброс пароля в Rutrip");
            helper.setText(plain, html);
            mailSender.send(mime);
            log.info("Письмо сброса пароля отправлено на {}", to);
        } catch (Exception ex) {
            log.warn("Не отправилось письмо на {}, ссылка: {}", to, link, ex);
        }
    }

    private static String greeting(String displayName) {
        String name = displayName == null ? "" : displayName.trim();
        if (name.isBlank()) return "Привет!";
        return "Привет, " + name + "!";
    }

    private static String escape(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }
}
