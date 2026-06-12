FROM python:3.9-slim
WORKDIR /app
RUN echo "<h1>You see this message because backenders did not write a Dockerfile yet!</h1>" > index.html
CMD ["python", "-m", "http.server", "8080"]
EXPOSE 8080