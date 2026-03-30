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
                "games": {
                    "times_tables": {
                        "playCount": 0,
                        "history": []
                    }
                }
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

@app.route(route="SaveSession", methods=["POST"])
def SaveSession(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        username = req_body.get('username')
        score = req_body.get('score')
        details = req_body.get('details') # Array of {table, correct}

        if not username or score is None or details is None:
            return func.HttpResponse("Missing required fields", status_code=400)

        username_norm = username.strip().lower()
        blob_client = get_blob_client()
        if not blob_client:
            return func.HttpResponse("Storage error", status_code=500)

        profiles = get_all_profiles(blob_client)
        user_profile = next((p for p in profiles if p['username'] == username_norm), None)

        if not user_profile:
            return func.HttpResponse("User not found", status_code=404)

        if 'games' not in user_profile:
            user_profile['games'] = {"times_tables": {"playCount": 0, "history": []}}
        
        tt_game = user_profile['games']['times_tables']
        tt_game['playCount'] += 1
        
        session = {
            "date": datetime.now().isoformat(),
            "score": score,
            "details": details
        }
        tt_game['history'].append(session)
        if len(tt_game['history']) > 20:
            tt_game['history'].pop(0)

        history = tt_game['history']
        last_5 = history[-5:]
        last_5_avg = sum(s['score'] for s in last_5) / (len(last_5) * 10) * 100

        table_performance = {str(i): {"correct": 0, "total": 0} for i in range(2, 13)}
        last_10 = history[-10:]
        for s in last_10:
            for d in s['details']:
                t = str(d['table'])
                if t in table_performance:
                    table_performance[t]['total'] += 1
                    if d['correct']:
                        table_performance[t]['correct'] += 1

        table_breakdown = {}
        for t, data in table_performance.items():
            if data['total'] > 0:
                table_breakdown[t] = round((data['correct'] / data['total']) * 100)
            else:
                table_breakdown[t] = None

        blob_client.upload_blob(json.dumps(profiles, indent=2), overwrite=True, content_settings=ContentSettings(content_type='application/json'))

        return func.HttpResponse(json.dumps({
            "playCount": tt_game['playCount'],
            "last5Avg": round(last_5_avg),
            "tableBreakdown": table_breakdown
        }), status_code=200, mimetype="application/json")

    except Exception as e:
        logging.error(f"Error in SaveSession: {str(e)}")
        return func.HttpResponse(f"Server Error: {str(e)}", status_code=500)
