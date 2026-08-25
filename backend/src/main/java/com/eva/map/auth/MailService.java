package com.eva.map.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final boolean enabled;

    public MailService(
            ObjectProvider<JavaMailSender> mailSender,
            @Value("${spring.mail.host:}") String host,
            @Value("${app.mail.from}") String from
    ) {
        this.mailSender = mailSender.getIfAvailable();
        this.from = from;
        this.enabled = this.mailSender != null && host != null && !host.isBlank();
    }

    public void sendPasswordReset(String to, String link) {
        String body = """
                Привет!

                Чтобы задать новый пароль в Rutrip, открой ссылку:
                %s

                Ссылка действует 1 час. Если ты не просил сброс — просто проигнорируй письмо.
                """.formatted(link);

        if (!enabled) {
            log.info("Письмо сброса пароля для {} (SMTP не настроен): {}", to, link);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject("Сброс пароля в Rutrip");
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Не отправилось письмо на {}, ссылка: {}", to, link, ex);
        }
    }
}
