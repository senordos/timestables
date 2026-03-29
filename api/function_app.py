import azure.functions as func
import logging
import json

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="SaveResults", methods=["POST"])
def SaveResults(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Python HTTP trigger processed a request.')

    try:
        req_body = req.get_json()
        student_name = req_body.get('studentName')
        score = req_body.get('score')

        if student_name and score is not None:
            logging.info(f"Received score: {score} for student: {student_name}")
            return func.HttpResponse("Result saved successfully!", status_code=200)
        else:
            return func.HttpResponse("Please pass studentName and score in the request body", status_code=400)
    except ValueError:
        return func.HttpResponse("Invalid JSON", status_code=400)
