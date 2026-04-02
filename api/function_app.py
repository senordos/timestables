import azure.functions as func
import logging
import json
import os
import hashlib
from datetime import datetime
from azure.storage.blob import BlobServiceClient, ContentSettings

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Configuration
connection_string = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
container_name = "profiles"
blob_name = "profiles.json"
VALID_ADMIN_KEY = "123321" 
APP_SOURCE_HEADER = "X-App-Source"
APP_SOURCE_VALUE = "TimestablesApp"

def get_blob_client():
    if not connection_string: return None
    try:
        blob_service_client = BlobServiceClient.from_connection_string(connection_string)
        container_client = blob_service_client.get_container_client(container_name)
        if not container_client.exists(): container_client.create_container()
        return blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    except Exception as e:
        logging.error(f"Error getting blob client: {str(e)}")
        return None

def hash_data(data):
    return hashlib.sha256(data.encode()).hexdigest()

def init_tt_stats():
    return {
        "playCount": 0,
        "overallTotal": 0,
        "overallCorrect": 0,
        "last5Scores": [None] * 5,
        "tableStats": [{"table": i, "last5": [None] * 5} for i in range(2, 13)],
        "config": {}
    }

def init_story_stats():
    return {
        "playCount": 0,
        "overallTotal": 0,
        "overallCorrect": 0,
        "last5Scores": [None] * 5,
        "config": {"difficulty": "easy"}
    }

def update_rolling_array(arr, val):
    arr.insert(0, val)
    return arr[:5]

def migrate_user(user):
    if 'games' not in user:
        user['games'] = {
            "times_tables": init_tt_stats(),
            "story_maths": init_story_stats()
        }
        return user
    
    # Ensure all game types exist
    if "times_tables" not in user['games']:
        user['games']["times_tables"] = init_tt_stats()
    if "story_maths" not in user['games']:
        user['games']["story_maths"] = init_story_stats()

    tt = user['games']["times_tables"]
    # Ensure tt config exists
    if 'config' not in tt: tt['config'] = {}

    if 'history' in tt:
        history = tt['history']
        new_stats = init_tt_stats()
        new_stats['playCount'] = tt.get('playCount', len(history))
        for session in reversed(history):
            score = session.get('score', 0)
            new_stats['overallCorrect'] += score
            new_stats['overallTotal'] += 10
            new_stats['last5Scores'] = update_rolling_array(new_stats['last5Scores'], score * 10)
            table_results = {}
            for d in session.get('details', []):
                t = d['table']
                if t not in table_results: table_results[t] = {"c": 0, "t": 0}
                table_results[t]['t'] += 1
                if d['correct']: table_results[t]['c'] += 1
            for t, res in table_results.items():
                perc = round((res['c'] / res['t']) * 100)
                for ts in new_stats['tableStats']:
                    if ts['table'] == t: ts['last5'] = update_rolling_array(ts['last5'], perc)
        user['games']['times_tables'] = new_stats
    return user

def get_blob_and_data():
    client = get_blob_client()
    if not client: return None, None
    return client, get_all_data(client)

def save_data(client, data):
    client.upload_blob(json.dumps(data, indent=2), overwrite=True, content_settings=ContentSettings(content_type='application/json'))

def get_all_data(blob_client):
    if not blob_client.exists(): return {"users": []}
    try:
        blob_data = blob_client.download_blob().readall()
        data = json.loads(blob_data)
        if isinstance(data, list): data = {"users": data}
        data["users"] = [migrate_user(u) for u in data["users"]]
        return data
    except Exception as e:
        logging.error(f"Error loading data: {str(e)}")
        return {"users": []}

def verify_request(req):
    return req.headers.get(APP_SOURCE_HEADER) == APP_SOURCE_VALUE

@app.route(route="HealthCheck", methods=["GET"])
def HealthCheck(req: func.HttpRequest) -> func.HttpResponse:
    return func.HttpResponse("API is up and running!", status_code=200)

@app.route(route="AdminStatus", methods=["GET"])
def AdminStatus(req: func.HttpRequest) -> func.HttpResponse:
    blob_client = get_blob_client()
    if not blob_client: return func.HttpResponse("Storage error", status_code=500)
    data = get_all_data(blob_client)
    return func.HttpResponse(json.dumps({"isSetup": "admin" in data}), status_code=200, mimetype="application/json")

@app.route(route="AdminAuth", methods=["POST"])
def AdminAuth(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        pin, mode = req_body.get('pin'), req_body.get('mode')
        if not pin: return func.HttpResponse("Missing PIN", status_code=400)
        blob_client = get_blob_client()
        data = get_all_data(blob_client)
        pin_hash = hash_data(pin)
        if mode == 'setup':
            if "admin" in data: return func.HttpResponse("Admin exists", status_code=409)
            data["admin"] = {"pinHash": pin_hash, "createdAt": datetime.now().isoformat()}
            blob_client.upload_blob(json.dumps(data, indent=2), overwrite=True, content_settings=ContentSettings(content_type='application/json'))
            return func.HttpResponse("Setup successful", status_code=201)
        elif mode == 'login':
            if "admin" in data and data["admin"]["pinHash"] == pin_hash:
                return func.HttpResponse("Login successful", status_code=200)
            return func.HttpResponse("Unauthorized", status_code=401)
    except Exception as e: return func.HttpResponse(f"Error: {str(e)}", status_code=500)

@app.route(route="GetRawProfiles", methods=["POST"])
def GetRawProfiles(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        if req_body.get('adminKey') != VALID_ADMIN_KEY: return func.HttpResponse("Unauthorized", status_code=401)
        blob_client = get_blob_client()
        data = get_all_data(blob_client)
        return func.HttpResponse(json.dumps(data["users"], indent=2), status_code=200, mimetype="application/json")
    except: return func.HttpResponse("Error", status_code=500)

@app.route(route="DeleteUser", methods=["POST"])
def DeleteUser(req: func.HttpRequest) -> func.HttpResponse:
    try:
        req_body = req.get_json()
        if req_body.get('adminKey') != VALID_ADMIN_KEY: return func.HttpResponse("Unauthorized", status_code=401)
        username = req_body.get('username')
        blob_client = get_blob_client()
        data = get_all_data(blob_client)
        username_norm = username.strip().lower()
        data["users"] = [p for p in data["users"] if p['username'] != username_norm]
        blob_client.upload_blob(json.dumps(data, indent=2), overwrite=True, content_settings=ContentSettings(content_type='application/json'))
        return func.HttpResponse("User deleted", status_code=200)
    except: return func.HttpResponse("Error", status_code=500)

@app.route(route="UpdateConfig", methods=["POST"])
def UpdateConfig(req: func.HttpRequest) -> func.HttpResponse:
    if not verify_request(req): return func.HttpResponse("Forbidden", status_code=403)
    try:
        req_body = req.get_json()
        username, game_type, new_config = req_body.get('username'), req_body.get('gameType', 'times_tables'), req_body.get('config')
        client, data = get_blob_and_data()
        user = next((p for p in data["users"] if p['username'] == username.strip().lower()), None)
        if not user: return func.HttpResponse("User not found", status_code=404)
        
        if game_type not in user['games']:
            # Fallback initialization
            if game_type == 'story_maths': user['games'][game_type] = init_story_stats()
            else: user['games'][game_type] = {"playCount": 0, "overallTotal": 0, "overallCorrect": 0, "last5Scores": [None] * 5, "config": {}}
        
        user['games'][game_type]['config'] = new_config
        save_data(client, data)
        return func.HttpResponse("Config updated", status_code=200)
    except Exception as e: return func.HttpResponse(str(e), status_code=500)

@app.route(route="AuthUser", methods=["POST"])
def AuthUser(req: func.HttpRequest) -> func.HttpResponse:
    if not verify_request(req): return func.HttpResponse("Forbidden", status_code=403)
    try:
        req_body = req.get_json()
        mode, username, passcode = req_body.get('mode'), req_body.get('username'), req_body.get('passcode')
        if not username or not passcode or not mode: return func.HttpResponse("Missing fields", status_code=400)
        if len(username) > 15: return func.HttpResponse(json.dumps({"message": "Name too long"}), status_code=400)
        client, data = get_blob_and_data()
        username_norm, passcode_hash = username.strip().lower(), hash_data(passcode)
        if mode == 'register':
            if any(p['username'] == username_norm for p in data["users"]): return func.HttpResponse(json.dumps({"message": "Name taken"}), status_code=409)
            if len(data["users"]) >= 15: return func.HttpResponse(json.dumps({"message": "Limit reached"}), status_code=403)
            new_user = {"username": username_norm, "displayName": username, "passcodeHash": passcode_hash, "createdAt": datetime.now().isoformat(), "games": {"times_tables": init_tt_stats(), "story_maths": init_story_stats()}}
            data["users"].append(new_user)
            save_data(client, data)
            return func.HttpResponse(json.dumps({"message": "Success", "user": username, "games": new_user["games"]}), status_code=201)
        elif mode == 'login':
            user = next((p for p in data["users"] if p['username'] == username_norm), None)
            if user and user['passcodeHash'] == passcode_hash:
                return func.HttpResponse(json.dumps({"message": "Success", "user": user['displayName'], "games": user["games"]}), status_code=200)
            return func.HttpResponse(json.dumps({"message": "Auth failed"}), status_code=401)
    except Exception as e: return func.HttpResponse(json.dumps({"message": str(e)}), status_code=500)

@app.route(route="SaveSession", methods=["POST"])
def SaveSession(req: func.HttpRequest) -> func.HttpResponse:
    if not verify_request(req): return func.HttpResponse("Forbidden", status_code=403)
    try:
        req_body = req.get_json()
        username, game_type, score, details = req_body.get('username'), req_body.get('gameType', 'times_tables'), req_body.get('score'), req_body.get('details')
        if details is None: return func.HttpResponse("Invalid data", status_code=400)
        client, data = get_blob_and_data()
        user = next((p for p in data["users"] if p['username'] == username.strip().lower()), None)
        if not user: return func.HttpResponse("User not found", status_code=404)
        
        if game_type not in user['games']:
            if game_type == 'story_maths': user['games'][game_type] = init_story_stats()
            else: user['games'][game_type] = {"playCount": 0, "overallTotal": 0, "overallCorrect": 0, "last5Scores": [None] * 5, "config": {}}
            
        game = user['games'][game_type]
        game['playCount'] += 1
        num_questions = len(details)
        game['overallTotal'] += num_questions
        game['overallCorrect'] += score
        game['last5Scores'] = update_rolling_array(game['last5Scores'], round((score / num_questions) * 100) if num_questions > 0 else 0)

        # Table-specific stats only for times_tables
        if game_type == 'times_tables' and 'tableStats' in game:
            table_results = {}
            for d in details:
                t = str(d['table'])
                if t not in table_results: table_results[t] = {"c": 0, "t": 0}
                table_results[t]['t'] += 1
                if d['correct']: table_results[t]['c'] += 1
            for t, res in table_results.items():
                perc = round((res['c'] / res['t']) * 100)
                for ts in game['tableStats']:
                    if str(ts['table']) == t: ts['last5'] = update_rolling_array(ts['last5'], perc)

        save_data(client, data)
        
        avg = lambda arr: round(sum(v for v in arr if v is not None) / len([v for v in arr if v is not None])) if any(v is not None for v in arr) else None
        
        result = {
            "playCount": game['playCount'],
            "last5Avg": avg(game['last5Scores'])
        }
        if game_type == 'times_tables' and 'tableStats' in game:
            result["tableBreakdown"] = {str(ts['table']): avg(ts['last5']) for ts in game['tableStats']}
            
        return func.HttpResponse(json.dumps(result), status_code=200, mimetype="application/json")
    except Exception as e: return func.HttpResponse(str(e), status_code=500)
