import json
from pathlib import Path


def find_hospital_json():

    data_directory = Path("data")

    if not data_directory.exists():
        return None

    json_files = list(
        data_directory.glob("*.json")
    )

    if not json_files:
        return None

    return json_files[0]


def load_hospitals():

    json_file = find_hospital_json()

    if json_file is None:
        return []

    try:

        with open(
            json_file,
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if isinstance(data, list):
            return data

        if isinstance(data, dict):

            if "hospitals" in data:
                return data["hospitals"]

            return [data]

        return []

    except Exception as error:

        print(
            f"Hospital JSON error: {error}"
        )

        return []