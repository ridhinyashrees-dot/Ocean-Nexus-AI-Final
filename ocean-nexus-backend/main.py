import os
import json
import re

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict

from dotenv import load_dotenv
from openai import AzureOpenAI

from argo_service import fetch_real_argo_data


# =========================================================
# ENVIRONMENT SETUP
# =========================================================

load_dotenv()

app = FastAPI(
    title="Ocean Nexus AI Engine",
    version="13.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# REQUEST MODEL
# =========================================================

class ChatQueryRequest(BaseModel):
    query: str
    history: Optional[List[Dict[str, str]]] = Field(
        default_factory=list
    )


# =========================================================
# AZURE OPENAI SETUP
# =========================================================

AZURE_KEY = os.getenv("AZURE_OPENAI_KEY", "")
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_DEPLOYMENT = os.getenv(
    "AZURE_OPENAI_DEPLOYMENT",
    "gpt-4o"
)

azure_client = None

if AZURE_KEY and AZURE_ENDPOINT:
    azure_client = AzureOpenAI(
        api_key=AZURE_KEY,
        api_version="2024-02-01",
        azure_endpoint=AZURE_ENDPOINT
    )


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():
    return {
        "status": "Ocean Nexus AI Engine Ready",
        "version": "13.0.0"
    }


# =========================================================
# ARGO DATA ENDPOINT
# =========================================================

@app.get("/api/argo")
def get_argo_data():

    try:
        argo_data = fetch_real_argo_data()

        trajectory = argo_data.get("trajectory", [])

        metrics = calculate_argo_metrics(trajectory)

        return {
            "success": True,
            "source": "ARGO GDAC",

            "float_id": argo_data.get(
                "float_id",
                "ARGO-GLOBAL"
            ),

            "latitude": argo_data.get(
                "latitude",
                15.0
            ),

            "longitude": argo_data.get(
                "longitude",
                80.0
            ),

            "trajectory": trajectory,

            "metrics": metrics,

            "source_file": argo_data.get(
                "source_file",
                ""
            )
        }

    except Exception as error:

        print("ARGO ERROR:", error)

        raise HTTPException(
            status_code=500,
            detail=f"Unable to fetch ARGO data: {str(error)}"
        )


# =========================================================
# DYNAMIC ARGO METRICS CALCULATION
# =========================================================

def calculate_argo_metrics(trajectory):

    """
    Calculates ocean metrics dynamically from real ARGO data.

    Expected trajectory point format:

    {
        "depth": 10.0,
        "temp": 28.5,
        "salinity": 34.8
    }
    """

    if not trajectory:
        return {
            "surface_temp": None,
            "deep_temp": None,
            "average_temp": None,
            "average_salinity": None,
            "max_depth": None,
            "depth_range": "Unknown",
            "measurement_count": 0
        }

    # -----------------------------------------------------
    # Extract valid temperature values
    # -----------------------------------------------------

    temperature_points = []

    for point in trajectory:

        depth = point.get("depth")
        temp = point.get("temp")

        if depth is None or temp is None:
            continue

        try:
            temperature_points.append({
                "depth": float(depth),
                "temp": float(temp)
            })
        except (ValueError, TypeError):
            continue

    # -----------------------------------------------------
    # Extract salinity values
    # -----------------------------------------------------

    salinity_values = []

    for point in trajectory:

        salinity = point.get("salinity")

        if salinity is None:
            continue

        try:
            salinity_values.append(float(salinity))
        except (ValueError, TypeError):
            continue

    # -----------------------------------------------------
    # Extract depth values
    # -----------------------------------------------------

    depth_values = []

    for point in trajectory:

        depth = point.get("depth")

        if depth is None:
            continue

        try:
            depth_values.append(float(depth))
        except (ValueError, TypeError):
            continue

    # -----------------------------------------------------
    # Surface and deep temperature
    # -----------------------------------------------------

    surface_temp = None
    deep_temp = None

    if temperature_points:

        # Shallowest measurement = surface temperature
        shallowest_point = min(
            temperature_points,
            key=lambda point: point["depth"]
        )

        # Deepest measurement = deep temperature
        deepest_point = max(
            temperature_points,
            key=lambda point: point["depth"]
        )

        surface_temp = shallowest_point["temp"]
        deep_temp = deepest_point["temp"]

    # -----------------------------------------------------
    # Average temperature
    # -----------------------------------------------------

    average_temp = None

    if temperature_points:

        average_temp = (
            sum(point["temp"] for point in temperature_points)
            / len(temperature_points)
        )

    # -----------------------------------------------------
    # Average salinity
    # -----------------------------------------------------

    average_salinity = None

    if salinity_values:

        average_salinity = (
            sum(salinity_values)
            / len(salinity_values)
        )

    # -----------------------------------------------------
    # Maximum depth
    # -----------------------------------------------------

    max_depth = None

    if depth_values:
        max_depth = max(depth_values)

    # -----------------------------------------------------
    # Depth range
    # -----------------------------------------------------

    depth_range = "Unknown"

    if max_depth is not None:
        depth_range = f"0–{max_depth:.0f}m"

    # -----------------------------------------------------
    # Return all calculated metrics
    # -----------------------------------------------------

    return {
        "surface_temp": (
            round(surface_temp, 2)
            if surface_temp is not None
            else None
        ),

        "deep_temp": (
            round(deep_temp, 2)
            if deep_temp is not None
            else None
        ),

        "average_temp": (
            round(average_temp, 2)
            if average_temp is not None
            else None
        ),

        "average_salinity": (
            round(average_salinity, 2)
            if average_salinity is not None
            else None
        ),

        "max_depth": (
            round(max_depth, 2)
            if max_depth is not None
            else None
        ),

        "depth_range": depth_range,

        "measurement_count": len(trajectory)
    }


# =========================================================
# DYNAMIC OCEAN AI PROCESSOR
# =========================================================

def dynamic_ocean_ai_processor(user_query: str):

    text = user_query.lower().strip()

    # -----------------------------------------------------
    # Casual greetings
    # -----------------------------------------------------

    greeting_words = [
        "hi",
        "hello",
        "hey",
        "how are you",
        "who are you",
        "how are u",
        "sup",
        "greetings"
    ]

    ocean_keywords = [
        "temp",
        "temperature",
        "ocean",
        "argo",
        "sea",
        "bay",
        "salinity",
        "depth",
        "heatwave",
        "marine",
        "float",
        "thermocline"
    ]

    is_greeting = any(
        re.search(
            rf"\b{re.escape(word)}\b",
            text
        )
        for word in greeting_words
    )

    is_ocean_query = any(
        keyword in text
        for keyword in ocean_keywords
    )

    if is_greeting and not is_ocean_query:

        return {
            "text_response": (
                "Hello! I am Ocean Nexus AI. "
                "I can analyze ARGO float oceanography, "
                "thermocline layers, salinity, temperature "
                "and marine heatwaves. "
                "How can I assist your marine research today?"
            ),

            "is_casual": True,
            "is_text_only": True,
            "visualization_params": None
        }

    # -----------------------------------------------------
    # Reasoning query detection
    # -----------------------------------------------------

    reasoning_keywords = [
        "why",
        "reason",
        "explain",
        "how come",
        "what causes",
        "cause",
        "due to",
        "meaning"
    ]

    is_reasoning_query = any(
        word in text
        for word in reasoning_keywords
    )

    # -----------------------------------------------------
    # Azure OpenAI processing
    # -----------------------------------------------------

    if azure_client:

        try:

            system_prompt = """
You are Ocean Nexus AI, an expert oceanographer.

Analyze the user's ocean-related query.

Return valid JSON only.

Required JSON keys:

{
  "is_text_only": boolean,
  "text_response": string,
  "title": string,
  "region": string,
  "start_year": string,
  "end_year": string,
  "has_heatwave": boolean
}

Rules:

- If the user asks why, explain, reason or cause,
  set is_text_only to true.
- If the user asks for map, chart, profile,
  temperature, salinity or ARGO analysis,
  set is_text_only to false.
- Do not invent exact real-time ARGO measurements.
- Real measurements will be calculated separately
  from the ARGO dataset.
- Mention scientific explanations clearly.
"""

            response = azure_client.chat.completions.create(
                model=AZURE_DEPLOYMENT,

                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_query
                    }
                ],

                response_format={
                    "type": "json_object"
                },

                temperature=0.3
            )

            content = response.choices[0].message.content

            ai_data = json.loads(content)

            region = ai_data.get(
                "region",
                "Arabian Sea"
                if "arabian" in text
                else "Bay of Bengal"
            )

            if "arabian" in region.lower():

                bbox = [
                    60.0,
                    8.0,
                    77.0,
                    25.0
                ]

            else:

                bbox = [
                    80.0,
                    5.0,
                    95.0,
                    22.0
                ]

            return {
                "text_response": ai_data.get(
                    "text_response",
                    f"Analyzing ARGO data for {region}."
                ),

                "is_casual": False,

                "is_text_only": ai_data.get(
                    "is_text_only",
                    is_reasoning_query
                ),

                "title": ai_data.get(
                    "title",
                    f"{region} 4D Telemetry Analysis"
                ),

                "visualization_params": {
                    "region": region,
                    "bbox": bbox,

                    "start_year": ai_data.get(
                        "start_year",
                        "2023"
                    ),

                    "end_year": ai_data.get(
                        "end_year",
                        "2024"
                    ),

                    "has_heatwave": ai_data.get(
                        "has_heatwave",
                        False
                    )
                }
            }

        except Exception as error:

            print(
                f"Azure OpenAI Error: {error}"
            )

    # -----------------------------------------------------
    # Fallback response
    # -----------------------------------------------------

    is_arabian = "arabian" in text

    region_name = (
        "Arabian Sea"
        if is_arabian
        else "Bay of Bengal"
    )

    if is_arabian:

        bbox = [
            60.0,
            8.0,
            77.0,
            25.0
        ]

        text_response = (
            "Analyzing ARGO telemetry for the Arabian Sea. "
            "The region is influenced by strong evaporation, "
            "high salinity and seasonal monsoon circulation."
        )

    else:

        bbox = [
            80.0,
            5.0,
            95.0,
            22.0
        ]

        text_response = (
            "Analyzing ARGO telemetry for the Bay of Bengal. "
            "River runoff, rainfall and monsoon circulation "
            "strongly influence surface salinity and temperature."
        )

    return {
        "text_response": text_response,

        "is_casual": False,

        "is_text_only": is_reasoning_query,

        "title": (
            f"{region_name} 4D Telemetry Analysis"
        ),

        "visualization_params": {
            "region": region_name,
            "bbox": bbox,
            "start_year": "2023",
            "end_year": "2024",
            "has_heatwave": False
        }
    }


# =========================================================
# CHAT ENDPOINT
# =========================================================

@app.post("/api/v1/chat")
def handle_chat_post(req: ChatQueryRequest):

    return process_chat_query(req.query)


@app.get("/api/v1/chat")
def handle_chat_get(q: Optional[str] = None):

    user_text = q or "Bay of Bengal temperature"

    return process_chat_query(user_text)


# =========================================================
# COMMON CHAT PROCESSOR
# =========================================================

def process_chat_query(user_text: str):

    ai_output = dynamic_ocean_ai_processor(
        user_text
    )

    # -----------------------------------------------------
    # Text-only response
    # -----------------------------------------------------

    if (
        ai_output["is_casual"]
        or ai_output.get("is_text_only", False)
    ):

        return {
            "success": True,
            "query": user_text,
            "chat_response": ai_output["text_response"],
            "generated_sql": "",
            "dashboard_payload": None,
            "visualization_ready": False
        }

    # -----------------------------------------------------
    # Fetch live ARGO data
    # -----------------------------------------------------

    try:

        argo_result = fetch_real_argo_data()

        trajectory_4d = argo_result.get(
            "trajectory",
            []
        )

        float_id = argo_result.get(
            "float_id",
            "ARGO-GLOBAL"
        )

        lat = argo_result.get(
            "latitude",
            15.0
        )

        lng = argo_result.get(
            "longitude",
            80.0
        )

        source_file = argo_result.get(
            "source_file",
            ""
        )

    except Exception as error:

        print(
            f"Live ARGO fetch error: {error}"
        )

        trajectory_4d = []

        float_id = "ARGO-FALLBACK"

        lat = 13.08
        lng = 80.27

        source_file = ""

    # -----------------------------------------------------
    # Calculate real metrics
    # -----------------------------------------------------

    metrics = calculate_argo_metrics(
        trajectory_4d
    )

    vis = ai_output.get(
        "visualization_params",
        {}
    )

    bbox = vis.get(
        "bbox",
        [
            80.0,
            5.0,
            95.0,
            22.0
        ]
    )

    region = vis.get(
        "region",
        "Bay of Bengal"
    )

    start_year = vis.get(
        "start_year",
        "2023"
    )

    end_year = vis.get(
        "end_year",
        "2024"
    )

    has_heatwave = vis.get(
        "has_heatwave",
        False
    )

    # -----------------------------------------------------
    # Display SQL
    # -----------------------------------------------------

    generated_sql = (
        "SELECT "
        "p.float_id, "
        "p.location, "
        "p.time, "
        "m.depth_m, "
        "m.temperature_c, "
        "m.salinity_psu "
        "FROM argo_profiles p "
        "JOIN argo_measurements m "
        "ON p.profile_id = m.profile_id "
        f"WHERE ST_Within("
        f"p.location, "
        f"ST_MakeEnvelope("
        f"{bbox[0]}, "
        f"{bbox[1]}, "
        f"{bbox[2]}, "
        f"{bbox[3]}, "
        f"4326"
        f")) "
        f"AND p.time BETWEEN "
        f"'{start_year}-01-01' "
        f"AND "
        f"'{end_year}-12-31' "
        "ORDER BY p.time ASC "
        "LIMIT 100;"
    )

    # -----------------------------------------------------
    # Dashboard payload
    # -----------------------------------------------------

    dashboard_payload = [
        {
            "float_id": float_id,

            "title": ai_output.get(
                "title",
                f"{region} 4D Telemetry Analysis"
            ),

            "region": region,

            # Real ARGO calculated values
            "surface_temp": metrics["surface_temp"],

            "deep_temp": metrics["deep_temp"],

            "average_temp": metrics["average_temp"],

            "average_salinity": metrics["average_salinity"],

            "depth_range": metrics["depth_range"],

            "max_depth": metrics["max_depth"],

            "measurement_count": metrics["measurement_count"],

            "lat": lat,

            "lng": lng,

            "has_heatwave": has_heatwave,

            "trajectory_4d": trajectory_4d,

            "source_file": source_file
        }
    ]

    return {
        "success": True,

        "query": user_text,

        "chat_response": ai_output["text_response"],

        "generated_sql": generated_sql,

        "dashboard_payload": dashboard_payload,

        "visualization_ready": True
    }