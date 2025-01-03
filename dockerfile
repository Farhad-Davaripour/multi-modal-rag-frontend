# Use an official Node.js runtime as the build stage
FROM node:16-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your code and build
COPY . .
RUN npm run build

# Use an Nginx image to serve the built static files
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
