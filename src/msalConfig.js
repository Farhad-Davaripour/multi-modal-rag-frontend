import { PublicClientApplication } from "@azure/msal-browser";

const { 
    REACT_APP_TENANT_ID, 
    REACT_APP_CLIENT_ID,
    REACT_APP_REDIRECT_URI
} = process.env;

export const msalConfig = {
  auth: {
    clientId: REACT_APP_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${REACT_APP_TENANT_ID}`,
    redirectUri: REACT_APP_REDIRECT_URI,
  }
};

// Create an MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);
