package com.example.SPOT.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class CsrfCookieFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(CsrfCookieFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        String cookieToken = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("XSRF-TOKEN".equals(cookie.getName())) {
                    cookieToken = cookie.getValue();
                }
            }
        }
        
        
        //String headerToken = request.getHeader("XSRF-TOKEN");
        
        //log.info("CSRF Pre-Filter: URI={}, Method={}, CookieXSRF={}, HeaderXSRF={}", 
        //         request.getRequestURI(), request.getMethod(), cookieToken, headerToken);

        filterChain.doFilter(request, response);
    }
}