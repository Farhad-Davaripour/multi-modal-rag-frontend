## Step-by-Step Guide to Implement React Frontend Using Azure App Service

### 1. Create a Dockerfile
In your React project root (where `package.json` is), create a file named `Dockerfile`:

```dockerfile
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
```

---

### 2. Build and Test Locally
1. Build the Docker image:
   ```powershell
   docker build -t react-frontend .
   ```
2. Run the container and test locally:
   ```powershell
   docker run -p 3000:80 react-frontend
   ```
3. Open http://localhost:3000 in your browser to verify the app.

---

### 3. Push the Image to Azure Container Registry (ACR)
1. Log in to your Azure Container Registry:
   ```powershell
   az acr login --name multimodalrag
   ```
2. Tag the image for ACR:
   ```powershell
   docker tag react-frontend multimodalrag.azurecr.io/react-frontend:v1
   ```
3. Push the image:
   ```powershell
   docker push multimodalrag.azurecr.io/react-frontend:v1
   ```

---

### 4. Deploy to Azure App Service

#### 4.1 Create an App Service Plan
```powershell
az appservice plan create --name multimodalrag-frontend-plan --resource-group rg-genAI-sandbox --is-linux --sku B1 --location canadacentral
```
(This creates a free-tier Linux plan named `multimodalrag-frontend-plan` in `rg-genAI-sandbox`.)

#### 4.2 Create a Web App with Your Container Image
```powershell
az webapp create `
  --resource-group rg-genAI-sandbox `
  --plan multimodalrag-frontend-plan `
  --name multimodalrag-frontend `
  --deployment-container-image-name multimodalrag.azurecr.io/react-frontend:v1
```
Replace `multimodalrag-frontend` with your desired unique app name.

#### 4.3 Configure Private Registry Credentials
1. Retrieve ACR credentials:
   ```powershell
   az acr credential show --name multimodalrag
   ```
   Note the `"username"` and one of the `"passwords"` from the output.
2. Configure the container settings:
   ```powershell
   $ACRPassword = (az acr credential show --name multimodalrag --query "passwords[0].value" -o tsv)
   $ACRUsername = (az acr credential show --name multimodalrag --query "username" -o tsv)
   az webapp config container set `
      --name multimodalrag-frontend `
      --resource-group rg-genAI-sandbox `
      --docker-registry-server-url "https://multimodalrag.azurecr.io" `      
      --docker-registry-server-user $ACRUsername `
      --docker-registry-server-password $ACRPassword `
      --docker-custom-image-name "multimodalrag.azurecr.io/react-frontend:v1"
   ```

#### 4.4 Browse Your App
```powershell
az webapp browse --resource-group rg-genAI-sandbox --name multimodalrag-frontend
```
You can also open the URL https://multimodalrag-frontend.azurewebsites.net in your browser.

---

### 5. Update `App.js` If Necessary
If your React app fetches backend data, ensure the backend’s IP or domain is correct:
```js
const res = await fetch("http://YOUR_BACKEND_ENDPOINT/query", { ... });
```
You can also use an environment variable at build time:
```js
const apiUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const res = await fetch(`${apiUrl}/query`, { ... });
```
Rebuild your Docker image if you change this.
