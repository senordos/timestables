import azure.functions as func
import logging
import json
import os
import hashlib
from datetime import datetime
from azure.storage.blob import BlobServiceClient, ContentSettings

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Blob Storage Configuration
connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
container_name = "profiles"
blob_name = "profiles.json"

def get_blob_client():
    if not connection_string:
        return None
    try:
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        container_client = blob_service_client.get_container_client(container_name)
        if not container_client.exists():
            container_client.create_container()
        return blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    except Exception as e:
        logging.error(f"Error getting blob client: {str(e)}")
        return None

def hash_passcode(passcode):
    return hashlib.sha256(passcode.encode()).hexdigest()

def get_all_profiles(blob_client):
    if not blob_client.exists():
        return []
    try:
        blob_data = blob_client.download_blob().readall()
        return json.loads(blob_data)
    except Exception as e:
        logging.error(f"Error loading profiles: {str(e)}")
        return []

@app.route(route="HealthCheck", methods=["GET"])
def HealthCheck(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse("API is up and running!", status_code=200)

@app.route(route="GetRawProfiles", methods=["GET"])
def GetRawProfiles(req: func.HttpRequest) -> func.HttpResponse:
    blob_client = get_blob_client()
    if not blob_client:
        return func.HttpResponse("Storage error", status_code=500)
    
    profiles = get_all_profiles(blob_client)
    return func.HttpResponse(json.dumps(profiles, indent=2), status_code=200, mimetype="application/json")

@app.route(route="AuthUser", methods=["POST"])
def AuthUser(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        mode = req_body.get('mode')
        username = req_body.get('username')
        passcode = req_body.get('passcode')

        if not username or not passcode or not mode:
            return func.HttpResponse("Missing required fields", status_code=400)

        username_norm = username.strip().lower()
        blob_client = get_blob_client()
        if not blob_client:
            return func.HttpResponse(json.dumps({"message": "Storage error"}), status_code=500)

        profiles = get_all_profiles(blob_client)
        passcode_hash = hash_passcode(passcode)

        if mode == 'register':
            if any(p['username'] == username_norm for p in profiles):
                return func.HttpResponse(json.dumps({"message": "Username already exists"}), status_code=409)
            
            new_profile = {
                "username": username_norm,
                "displayName": username,
                "passcodeHash": passcode_hash,
                "createdAt": datetime.now().isoformat(),
                "stats": {}
            }
            profiles.append(new_profile)
            blob_client.upload_blob(json.dumps(profiles, indent=2), overwrite=True, content_settings=ContentSettings(content_type='application/json'))
            return func.HttpResponse(json.dumps({"message": "Registration successful", "user": username}), status_code=201)

        elif mode == 'login':
            user_profile = next((p for p in profiles if p['username'] == username_norm), None)
            if not user_profile:
                return func.HttpResponse(json.dumps({"message": "User not found"}), status_code=404)
            
            if user_profile['passcodeHash'] == passcode_hash:
                return func.HttpResponse(json.dumps({"message": "Login successful", "user": user_profile['displayName']}), status_code=200)
            else:
                return func.HttpResponse(json.dumps({"message": "Incorrect passcode"}), status_code=401)

    except Exception as e:
        logging.error(f"Error in AuthUser: {str(e)}")
        return func.HttpResponse(json.dumps({"message": f"Server Error: {str(e)}"}), status_code=500)
