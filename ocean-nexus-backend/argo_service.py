import gzip
import csv
import io
import re
import requests
import numpy as np
import xarray as xr
from datetime import datetime, timedelta


ARGO_BASE_URL = "https://usgodae.org/ftp/outgoing/argo/"

ARGO_PROFILE_INDEX_URL = (
    ARGO_BASE_URL + "ar_index_global_prof.txt.gz"
)

MAX_PROFILES = 10


def download_argo_index():
    print("Downloading ARGO profile index...")

    response = requests.get(
        ARGO_PROFILE_INDEX_URL,
        timeout=180,
        headers={
            "User-Agent": "Ocean-Nexus-AI/1.0"
        }
    )

    response.raise_for_status()

    print("ARGO response status:", response.status_code)
    print("ARGO content type:", response.headers.get("content-type"))
    print("ARGO compressed size:", len(response.content))

    # Decompress gzip data
    data = gzip.decompress(response.content)

    print("ARGO decompressed size:", len(data))

    text = data.decode("utf-8", errors="replace")

    return text


def find_argo_profile_files():
    text = download_argo_index()

    lines = text.splitlines()

    print("ARGO index lines:", len(lines))

    header_index = None

    # Find actual CSV header
    for i, line in enumerate(lines):

        cleaned = line.strip()

        if cleaned.startswith("file,date,latitude,longitude"):
            header_index = i
            print("ARGO CSV header found at line:", i)
            print("HEADER:", cleaned)
            break

    if header_index is None:
        raise Exception(
            "ARGO profile index CSV header not found after gzip decompression"
        )

    headers = [
        h.strip()
        for h in lines[header_index].split(",")
    ]

    print("ARGO headers:", headers)

    file_index = headers.index("file")
    date_index = headers.index("date")

    records = []

    for line in lines[header_index + 1:]:

        if not line.strip():
            continue

        try:
            values = next(csv.reader([line]))

            if len(values) <= max(file_index, date_index):
                continue

            file_path = values[file_index].strip()
            date_value = values[date_index].strip()

            if not file_path.endswith(".nc"):
                continue

            # Extract float ID
            match = re.search(
                r"[RD](\d{7})_\d+\.nc",
                file_path
            )

            if not match:
                continue

            float_id = match.group(1)

            records.append({
                "file": file_path,
                "date": date_value,
                "float_id": float_id
            })

        except Exception:
            continue

    if not records:
        raise Exception("No ARGO profile records found")

    print("Total ARGO profile records:", len(records))

    # Latest profile in index
    latest_record = records[-1]

    float_id = latest_record["float_id"]

    print("Latest float ID:", float_id)

    # Get profiles belonging to same float
    same_float = [
        record
        for record in records
        if record["float_id"] == float_id
    ]

    print(
        "Profiles found for float",
        float_id,
        ":",
        len(same_float)
    )

    # Sort by date
    same_float.sort(
        key=lambda x: x["date"]
    )

    # Take latest profiles
    selected = same_float[-MAX_PROFILES:]

    print("Selected profiles:")

    for record in selected:
        print(
            record["date"],
            record["file"]
        )

    return selected


def safe_float(value):
    try:
        value = float(value)

        if not np.isfinite(value):
            return None

        return value

    except Exception:
        return None


def build_argo_file_url(file_path):

    file_path = file_path.strip()

    if file_path.startswith("http"):
        return file_path

    if file_path.startswith("dac/"):
        return ARGO_BASE_URL + file_path

    return ARGO_BASE_URL + "dac/" + file_path


def convert_juld_to_time(juld_value):

    try:
        value = float(juld_value)

        if not np.isfinite(value):
            return None

        base_date = datetime(1950, 1, 1)

        result = base_date + timedelta(days=value)

        return result.isoformat()

    except Exception:
        return None


def read_argo_netcdf(file_url):

    print("Downloading ARGO profile:")
    print(file_url)

    response = requests.get(
        file_url,
        timeout=120,
        headers={
            "User-Agent": "Ocean-Nexus-AI/1.0"
        }
    )

    response.raise_for_status()

    dataset = xr.open_dataset(
        io.BytesIO(response.content),
        engine="netcdf4"
    )

    try:

        if "LATITUDE" not in dataset:
            raise Exception("LATITUDE variable missing")

        if "LONGITUDE" not in dataset:
            raise Exception("LONGITUDE variable missing")

        if "PRES" not in dataset:
            raise Exception("PRES variable missing")

        if "TEMP" not in dataset:
            raise Exception("TEMP variable missing")

        latitude = np.asarray(
            dataset["LATITUDE"].values
        ).flatten()

        longitude = np.asarray(
            dataset["LONGITUDE"].values
        ).flatten()

        profile_latitude = safe_float(latitude[0])
        profile_longitude = safe_float(longitude[0])

        # --------------------------------
        # FLOAT ID
        # --------------------------------

        float_id = "Unknown"

        if "PLATFORM_NUMBER" in dataset:

            platform = np.asarray(
                dataset["PLATFORM_NUMBER"].values
            ).flatten()

            if len(platform) > 0:

                try:

                    float_id = str(
                        platform[0]
                    ).strip()

                    float_id = (
                        float_id
                        .replace("b'", "")
                        .replace("'", "")
                    )

                except Exception:
                    float_id = "Unknown"

        # --------------------------------
        # PRESSURE
        # --------------------------------

        pressure = np.asarray(
            dataset["PRES"].values
        )

        # --------------------------------
        # TEMPERATURE
        # --------------------------------

        temperature = np.asarray(
            dataset["TEMP"].values
        )

        # --------------------------------
        # SALINITY
        # --------------------------------

        if "PSAL" in dataset:

            salinity = np.asarray(
                dataset["PSAL"].values
            )

        else:

            salinity = None

        # --------------------------------
        # TIME
        # --------------------------------

        profile_times = []

        if "JULD" in dataset:

            juld_values = np.asarray(
                dataset["JULD"].values
            ).flatten()

            for value in juld_values:

                profile_times.append(
                    convert_juld_to_time(value)
                )

        # --------------------------------
        # CONVERT PROFILE DIMENSIONS
        # --------------------------------

        if pressure.ndim == 1:

            pressure_profiles = [
                pressure
            ]

        else:

            pressure_profiles = [
                pressure[i]
                for i in range(
                    pressure.shape[0]
                )
            ]

        if temperature.ndim == 1:

            temperature_profiles = [
                temperature
            ]

        else:

            temperature_profiles = [
                temperature[i]
                for i in range(
                    temperature.shape[0]
                )
            ]

        if salinity is None:

            salinity_profiles = [
                None
            ] * len(pressure_profiles)

        elif salinity.ndim == 1:

            salinity_profiles = [
                salinity
            ]

        else:

            salinity_profiles = [
                salinity[i]
                for i in range(
                    salinity.shape[0]
                )
            ]

        # --------------------------------
        # BUILD TRAJECTORY
        # --------------------------------

        trajectory = []

        number_of_profiles = min(
            len(pressure_profiles),
            len(temperature_profiles)
        )

        for profile_index in range(
            number_of_profiles
        ):

            profile_pressure = np.asarray(
                pressure_profiles[
                    profile_index
                ]
            ).flatten()

            profile_temperature = np.asarray(
                temperature_profiles[
                    profile_index
                ]
            ).flatten()

            profile_salinity = (
                salinity_profiles[
                    profile_index
                ]
                if profile_index
                < len(salinity_profiles)
                else None
            )

            if profile_salinity is not None:

                profile_salinity = np.asarray(
                    profile_salinity
                ).flatten()

            # Get profile time

            if (
                profile_index
                < len(profile_times)
                and profile_times[
                    profile_index
                ] is not None
            ):

                profile_time = profile_times[
                    profile_index
                ]

            else:

                profile_time = (
                    datetime.utcnow().isoformat()
                )

            # --------------------------------
            # EACH DEPTH LEVEL
            # --------------------------------

            for level_index in range(
                len(profile_pressure)
            ):

                depth = safe_float(
                    profile_pressure[
                        level_index
                    ]
                )

                if depth is None:
                    continue

                temp = None

                if (
                    level_index
                    < len(profile_temperature)
                ):

                    temp = safe_float(
                        profile_temperature[
                            level_index
                        ]
                    )

                salt = None

                if (
                    profile_salinity
                    is not None
                    and level_index
                    < len(profile_salinity)
                ):

                    salt = safe_float(
                        profile_salinity[
                            level_index
                        ]
                    )

                trajectory.append(
                    {
                        "time": profile_time,
                        "lat": profile_latitude,
                        "lng": profile_longitude,
                        "depth": depth,
                        "temp": temp,
                        "salinity": salt
                    }
                )

        return {
            "float_id": float_id,
            "latitude": profile_latitude,
            "longitude": profile_longitude,
            "trajectory": trajectory,
            "source_file": file_url
        }

    finally:

        dataset.close()


def fetch_real_argo_data():

    print("======================================")
    print("FETCHING REAL ARGO DATA")
    print("======================================")

    selected_profiles = find_argo_profile_files()

    all_trajectory = []

    float_id = "Unknown"

    latest_latitude = None

    latest_longitude = None

    source_file = None

    # --------------------------------
    # READ SELECTED PROFILES
    # --------------------------------

    for record in selected_profiles:

        try:

            file_path = record["file"]

            file_url = build_argo_file_url(
                file_path
            )

            profile_data = read_argo_netcdf(
                file_url
            )

            float_id = profile_data[
                "float_id"
            ]

            latest_latitude = profile_data[
                "latitude"
            ]

            latest_longitude = profile_data[
                "longitude"
            ]

            source_file = profile_data[
                "source_file"
            ]

            all_trajectory.extend(
                profile_data["trajectory"]
            )

        except Exception as error:

            print(
                "FAILED PROFILE:",
                record["file"]
            )

            print(
                "ERROR:",
                error
            )

            continue

    # --------------------------------
    # CHECK DATA
    # --------------------------------

    if not all_trajectory:

        raise Exception(
            "Could not read any ARGO profile data"
        )

    # --------------------------------
    # SORT BY TIME
    # --------------------------------

    all_trajectory.sort(
        key=lambda point:
        point.get("time") or ""
    )

    print("======================================")
    print("ARGO DATA SUCCESS")
    print(
        "Float ID:",
        float_id
    )

    print(
        "Latitude:",
        latest_latitude
    )

    print(
        "Longitude:",
        latest_longitude
    )

    print(
        "Trajectory points:",
        len(all_trajectory)
    )

    print("======================================")

    return {
        "float_id": float_id,
        "latitude": latest_latitude,
        "longitude": latest_longitude,
        "trajectory": all_trajectory,
        "source_file": source_file
    }