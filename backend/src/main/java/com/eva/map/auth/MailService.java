package com.eva.map.auth;

import jakarta.mail.internet.InternetAddress;
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

    public void sendPasswordReset(String to, String displayName, String link) {
        String name = displayName == null ? "" : displayName.trim();
        String hello = name.isBlank() ? "Привет." : "Привет, " + name + ".";
        String plain = """
                %s

                Кто-то попросил новый пароль в Rutrip. Если это ты, открой ссылку в течение часа:

                %s

                Если это была не ты, просто удали письмо.
                """.formatted(hello, link);

        if (!enabled) {
            log.info("Письмо сброса пароля для {} (SMTP не настроен)", to);
            return;
        }

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress());
            helper.setTo(to);
            helper.setSubject("Ссылка для Rutrip");
            helper.setText(plain, false);
            mailSender.send(mime);
            log.info("Письмо сброса пароля отправлено на {}", to);
        } catch (Exception ex) {
            log.warn("Не отправилось письмо на {}: {}", to, rootMessage(ex));
        }
    }

    private InternetAddress fromAddress() throws Exception {
        InternetAddress[] parsed = InternetAddress.parse(from, false);
        if (parsed.length == 0) return new InternetAddress(from);
        InternetAddress address = parsed[0];
        address.setPersonal(null);
        return address;
    }

    private static String rootMessage(Throwable ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current.toString();
    }
}
