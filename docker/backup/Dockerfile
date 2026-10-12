FROM alpine:3.20
RUN apk add --no-cache bash postgresql16-client restic tzdata coreutils
COPY backup.sh loop.sh restore.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
CMD ["/usr/local/bin/loop.sh"]
