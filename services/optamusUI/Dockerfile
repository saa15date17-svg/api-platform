# syntax=docker/dockerfile:1
ARG BUILD_HASH=dev-build

######## WebUI Frontend Build Stage ########
FROM --platform=$BUILDPLATFORM node:22-alpine3.20 AS build
ARG BUILD_HASH

WORKDIR /app
RUN apk add --no-cache git

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --force

# Copy source and build the static SPA
COPY . .
ENV APP_BUILD_HASH=${BUILD_HASH}
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

######## Nginx Serving Stage ########
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy the built SvelteKit static files
COPY --from=build /app/build /usr/share/nginx/html

# Copy our custom Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Listen on 8080 as expected by docker-compose
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
