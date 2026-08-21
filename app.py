from flask import Flask, render_template


from routes.ai_routes import ai_bp
from routes.auth_routes import auth_bp
from routes.hospital_routes import hospital_bp
from routes.medical_routes import medical_bp
from routes.blood_routes import blood_bp
from routes.emergency_routes import emergency_bp
from routes.scheme_routes import scheme_bp
from routes.grievance_routes import grievance_bp


app = Flask(__name__)


# =========================================================
# FRONTEND
# =========================================================

@app.route("/")
def home():

    return render_template(
        "index.html"
    )


# =========================================================
# HEALTH CHECK
# =========================================================

@app.route("/health")
def health():

    return {
        "status": "ok",
        "application": "MediAlert",
        "backend": "Flask"
    }


# =========================================================
# API BLUEPRINTS
# =========================================================

app.register_blueprint(
    ai_bp
)

app.register_blueprint(
    auth_bp
)

app.register_blueprint(
    hospital_bp
)

app.register_blueprint(
    medical_bp
)

app.register_blueprint(
    blood_bp
)

app.register_blueprint(
    emergency_bp
)

app.register_blueprint(
    scheme_bp
)

app.register_blueprint(
    grievance_bp
)


# =========================================================
# SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )