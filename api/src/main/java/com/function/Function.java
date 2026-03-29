package com.function;

import java.util.*;
import com.microsoft.azure.functions.annotation.*;
import com.microsoft.azure.functions.*;

/**
 * Azure Functions with HTTP Trigger.
 */
public class Function {
    /**
     * This function listens at endpoint "/api/SaveResults".
     */
    @FunctionName("SaveResults")
    public HttpResponseMessage run(
            @HttpTrigger(name = "req", methods = {HttpMethod.POST}, authLevel = AuthorizationLevel.ANONYMOUS) HttpRequestMessage<Optional<QuizResult>> request,
            final ExecutionContext context) {
        context.getLogger().info("Java HTTP trigger processed a request.");

        Optional<QuizResult> quizResult = request.getBody();

        if (quizResult.isPresent()) {
            QuizResult result = quizResult.get();
            context.getLogger().info("Received score: " + result.getScore() + " for student: " + result.getStudentName());
            return request.createResponseBuilder(HttpStatus.OK).body("Result saved successfully!").build();
        } else {
            return request.createResponseBuilder(HttpStatus.BAD_REQUEST).body("Please pass a valid QuizResult in the request body").build();
        }
    }
}
