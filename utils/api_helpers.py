def success_response(
    data=None,
    message=None
):

    response = {
        "success": True
    }

    if message is not None:
        response["message"] = message

    if data is not None:
        response["data"] = data

    return response


def error_response(
    message,
    status_code=400
):

    return {
        "success": False,
        "error": message
    }, status_code