# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Step-by-Step Guide to Implement React Frontend

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
3. Open [http://localhost:3000](http://localhost:3000) in your browser to verify.

---

### 3. Push the Image to Azure Container Registry (ACR)

1. Log in to your Azure Container Registry (replace `multimodalrag` with your ACR name):
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

### 4. Deploy to Azure Kubernetes Service (AKS)

#### 4.1 Create Deployment and Service YAML

Create a file named `react-frontend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: react-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: react-frontend
  template:
    metadata:
      labels:
        app: react-frontend
    spec:
      containers:
      - name: react-frontend
        image: multimodalrag.azurecr.io/react-frontend:v1
        ports:
        - containerPort: 80
        imagePullPolicy: Always
        env:
        # Optionally set environment variables if needed:
        # - name: REACT_APP_BACKEND_URL
        #   value: "http://4.227.76.55"
      imagePullSecrets:
      - name: acr-secret
---
apiVersion: v1
kind: Service
metadata:
  name: react-frontend-service
spec:
  type: LoadBalancer
  selector:
    app: react-frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
```

#### 4.2 Apply the Deployment and Service

1. Ensure your AKS credentials are set:
   ```powershell
   az aks get-credentials --resource-group rg-genAI-sandbox --name RAGMultiModalCluster
   ```
2. Apply the YAML file:
   ```powershell
   kubectl apply -f react-frontend-deployment.yaml
   ```

#### 4.3 Retrieve the External IP

1. Run the following command:
   ```powershell
   kubectl get services
   ```
2. Look for `react-frontend-service` and note the `EXTERNAL-IP`. Open this IP in your browser to access the app.

---

### 5. Update `App.js` If Necessary

- If your React app fetches backend data, ensure the backend's IP or domain is correct:

  ```js
  const res = await fetch("http://4.227.76.55/query", { ... });
  ```
- To make this dynamic, use an environment variable:

  ```js
  const apiUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${apiUrl}/query`, { ... });
  ```

- If the backend URL changes, rebuild the Docker image or use environment variables.

---

### Summary of Commands

1. **Build Docker Image**:
   ```powershell
   docker build -t react-frontend .
   ```
2. **Test Locally**:
   ```powershell
   docker run -p 3000:80 react-frontend
   ```
3. **Push to ACR**:
   ```powershell
   docker tag react-frontend multimodalrag.azurecr.io/react-frontend:v1
   docker push multimodalrag.azurecr.io/react-frontend:v1
   ```
4. **Deploy to AKS**:
   ```powershell
   kubectl apply -f react-frontend-deployment.yaml
   kubectl get services
   ```
5. **Access via EXTERNAL-IP** from `kubectl get services`.

Adjust `App.js` if needed (e.g., environment variables or updated backend endpoint).
