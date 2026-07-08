FROM ghcr.io/zitadel/zitadel:v4.13.0

# The Zitadel image already has an ENTRYPOINT defined
# We just need to pass the correct arguments
CMD ["start-from-init", "--masterkeyFromEnv", "--tlsMode", "disabled"]