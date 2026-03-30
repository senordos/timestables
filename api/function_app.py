import azure.functions as func
import logging
import json
import os
import hashlib
from azure.storage.blob import BlobServiceClient, ContentSettings

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Blob Storage Configuration
# AzureWebJobsStorage is the default connection string for the storage account associated with the Function App
connection_string = os.environ.get("AzureWebJobsStorage")
container_name = "profiles"

def get_blob_client(username):
    if not connection_string:
        return None
    try:
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        # Create container if it doesn't exist
        container_client = blob_service_client.get_container_client(container_name)
        if not container_client.exists():
            container_client.create_container()
        
        return blob_service_client.get_blob_client(container=container_name, blob=f"{username}.json")
    except Exception as e:
        logging.error(f"Error getting blob client: {str(e)}")
        return None

def hash_passcode(passcode):
    return hashlib.sha256(passcode.encode()).hexdigest()

@app.route(route="SaveResults", methods=["POST"])
def SaveResults(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger processed a request.')
    # This remains as a placeholder for now
    return func.HttpResponse("Result saved successfully!", status_code=200)

@app.route(route="AuthUser", methods=["POST"])
def AuthUser(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('AuthUser function processed a request.')

    try:
        req_body = req.get_json()
        mode = req_body.get('mode') # 'login' or 'register'
        username = req_body.get('username')
        passcode = req_body.get('passcode')

        if not username or not passcode or not mode:
            return func.HttpResponse("Missing required fields", status_code=400)

        username = username.strip().lower() # Normalize username
        blob_client = get_blob_client(username)
        
        if not blob_client:
            return func.HttpResponse("Storage configuration error", status_code=500)

        passcode_hash = hash_passcode(passcode)

        if mode == 'register':
            if blob_client.exists():
                return func.HttpResponse("Username already exists", status_code=409)
            
            # Create new profile
            profile = {
                "username": username,
                "passcodeHash": passcode_hash,
                "displayName": req_body.get('username'), # Keep original casing for display
                "createdAt": func.datetime.datetime.now().isoformat(),
                "stats": {}
            }
            
            blob_client.upload_blob(json.dumps(profile), overwrite=True, content_settings=ContentSettings(content_type='application/json'))
            return func.HttpResponse(json.dumps({"message": "Registration successful", "user": profile["displayName"]}), status_code=201, mimetype="application/json")

        elif mode == 'login':
            if not blob_client.exists():
                return func.HttpResponse("User not found", status_code=404)
            
            blob_data = blob_client.download_blob().readall()
            profile = json.loads(blob_data)
            
            if profile.get('passcodeHash') == passcode_hash:
                return func.HttpResponse(json.dumps({"message": "Login successful", "user": profile.get("displayName", username)}), status_code=200, mimetype="application/json")
            else:
                return func.HttpResponse("Incorrect passcode", status_code=401)

        return func.HttpResponse("Invalid mode", status_code=400)

    except Exception as e:
        logging.error(f"Error in AuthUser: {str(e)}")
        return func.HttpResponse(f"An error occurred: {str(e)}", status_code=500)
