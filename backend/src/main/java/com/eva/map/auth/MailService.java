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

    public void sendPasswordReset(String to, String code) {
        String plain = "Code: " + code + "\n";

        if (!enabled) {
            log.info("Password reset mail skipped (SMTP off) for {}", to);
            return;
        }

        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress());
            helper.setTo(to);
            helper.setSubject("Rutrip");
            helper.setText(plain, false);
            mailSender.send(mime);
            log.info("Password reset mail sent to {}", to);
        } catch (Exception ex) {
            log.warn("Password reset mail failed for {}: {}", to, rootMessage(ex));
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
