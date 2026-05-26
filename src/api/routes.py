from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token

from api.models import (
    db,
    User,
    Court,
    CourtReservation,
    Coach,
    ClassReservation,
    Tournament,
    TournamentRegistration,
    Ranking,
)

api = Blueprint("api", __name__)


def parse_date(date_string):
    return datetime.strptime(date_string, "%Y-%m-%d").date()


def parse_time(time_string):
    return datetime.strptime(time_string, "%H:%M").time()


def time_to_minutes(time_value):
    return time_value.hour * 60 + time_value.minute


def normalize_time_range(start_time, end_time):
    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)

    if end_minutes <= start_minutes:
        end_minutes += 24 * 60

    return start_minutes, end_minutes


def time_ranges_overlap(start_a, end_a, start_b, end_b):
    start_a_minutes, end_a_minutes = normalize_time_range(start_a, end_a)
    start_b_minutes, end_b_minutes = normalize_time_range(start_b, end_b)

    return start_a_minutes < end_b_minutes and end_a_minutes > start_b_minutes


@api.route("/hello", methods=["GET"])
def handle_hello():
    return jsonify({"message": "Padel Web API running"}), 200
# -------------------------
# AUTH
# -------------------------

@api.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    level = data.get("level")
    role = data.get("role", "player")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not password:
        return jsonify({"error": "Password is required"}), 400

    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(password)

    user = User(
        email=email,
        password=hashed_password,
        name=name,
        role=role,
        level=level,
        is_active=True,
    )

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "User registered successfully",
        "token": access_token,
        "user": user.serialize(),
    }), 201


@api.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    email = data.get("email")
    password = data.get("password")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    if not password:
        return jsonify({"error": "Password is required"}), 400

    user = User.query.filter_by(email=email).first()

    if user is None:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password_hash(user.password, password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "user": user.serialize(),
    }), 200


# -------------------------
# USERS
# -------------------------

@api.route("/users", methods=["GET"])
def get_users():
    users = User.query.all()
    return jsonify([user.serialize() for user in users]), 200


@api.route("/users/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get(user_id)

    if user is None:
        return jsonify({"error": "User not found"}), 404

    return jsonify(user.serialize()), 200


@api.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    if not data.get("email"):
        return jsonify({"error": "email is required"}), 400

    if not data.get("password"):
        return jsonify({"error": "password is required"}), 400

    existing_user = User.query.filter_by(email=data.get("email")).first()

    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(data.get("password"))

    user = User(
        email=data.get("email"),
        password=hashed_password,
        name=data.get("name"),
        role=data.get("role", "player"),
        level=data.get("level"),
        is_active=data.get("is_active", True),
    )

    db.session.add(user)
    db.session.commit()

    return jsonify(user.serialize()), 201


@api.route("/users/<int:user_id>", methods=["PUT"])
def update_user(user_id):
    user = User.query.get(user_id)

    if user is None:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    user.email = data.get("email", user.email)
    user.password = data.get("password", user.password)
    user.name = data.get("name", user.name)
    user.role = data.get("role", user.role)
    user.level = data.get("level", user.level)
    user.is_active = data.get("is_active", user.is_active)

    db.session.commit()

    return jsonify(user.serialize()), 200


@api.route("/users/<int:user_id>", methods=["DELETE"])
def delete_user(user_id):
    user = User.query.get(user_id)

    if user is None:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"}), 200


# -------------------------
# COURTS
# -------------------------

@api.route("/courts", methods=["GET"])
def get_courts():
    courts = Court.query.all()
    return jsonify([court.serialize() for court in courts]), 200


@api.route("/courts/<int:court_id>", methods=["GET"])
def get_court(court_id):
    court = Court.query.get(court_id)

    if court is None:
        return jsonify({"error": "Court not found"}), 404

    return jsonify(court.serialize()), 200


@api.route("/courts", methods=["POST"])
def create_court():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    if not data.get("name"):
        return jsonify({"error": "Court name is required"}), 400

    court = Court(
        name=data.get("name"),
        court_type=data.get("court_type"),
        price_per_hour=data.get("price_per_hour", 20),
        is_active=data.get("is_active", True),
    )

    db.session.add(court)
    db.session.commit()

    return jsonify(court.serialize()), 201


@api.route("/courts/<int:court_id>", methods=["PUT"])
def update_court(court_id):
    court = Court.query.get(court_id)

    if court is None:
        return jsonify({"error": "Court not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    court.name = data.get("name", court.name)
    court.court_type = data.get("court_type", court.court_type)
    court.price_per_hour = data.get("price_per_hour", court.price_per_hour)
    court.is_active = data.get("is_active", court.is_active)

    db.session.commit()

    return jsonify(court.serialize()), 200


@api.route("/courts/<int:court_id>", methods=["DELETE"])
def delete_court(court_id):
    court = Court.query.get(court_id)

    if court is None:
        return jsonify({"error": "Court not found"}), 404

    db.session.delete(court)
    db.session.commit()

    return jsonify({"message": "Court deleted successfully"}), 200


# -------------------------
# COURT RESERVATIONS
# -------------------------

@api.route("/court-reservations", methods=["GET"])
def get_court_reservations():
    reservations = CourtReservation.query.all()
    return jsonify([reservation.serialize() for reservation in reservations]), 200


@api.route("/court-reservations", methods=["POST"])
def create_court_reservation():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    required_fields = ["user_id", "court_id", "date", "start_time", "end_time"]

    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    user = User.query.get(data.get("user_id"))

    if user is None:
        return jsonify({"error": "User not found"}), 404

    court = Court.query.get(data.get("court_id"))

    if court is None:
        return jsonify({"error": "Court not found"}), 404

    if not court.is_active:
        return jsonify({"error": "Court is not active"}), 400

    reservation_date = parse_date(data.get("date"))
    start_time = parse_time(data.get("start_time"))
    end_time = parse_time(data.get("end_time"))

    if end_time <= start_time:
        return jsonify({
            "error": "La hora de fin debe ser posterior a la hora de inicio"
        }), 400

    existing_reservation = CourtReservation.query.filter(
        CourtReservation.court_id == data.get("court_id"),
        CourtReservation.date == reservation_date,
        CourtReservation.start_time < end_time,
        CourtReservation.end_time > start_time,
    ).first()

    if existing_reservation:
        return jsonify({
            "error": "Esta pista ya está reservada en ese horario"
        }), 400

    reservation = CourtReservation(
        user_id=data.get("user_id"),
        court_id=data.get("court_id"),
        date=reservation_date,
        start_time=start_time,
        end_time=end_time,
        price=data.get("price", 0),
        status="confirmed",
    )

    db.session.add(reservation)
    db.session.commit()

    return jsonify(reservation.serialize()), 201


@api.route("/court-reservations/<int:reservation_id>", methods=["DELETE"])
def delete_court_reservation(reservation_id):
    reservation = CourtReservation.query.get(reservation_id)

    if reservation is None:
        return jsonify({"error": "Reservation not found"}), 404

    db.session.delete(reservation)
    db.session.commit()

    return jsonify({"message": "Reservation deleted successfully"}), 200


# -------------------------
# COACHES
# -------------------------

@api.route("/coaches", methods=["GET"])
def get_coaches():
    coaches = Coach.query.all()
    return jsonify([coach.serialize() for coach in coaches]), 200


@api.route("/coaches/<int:coach_id>", methods=["GET"])
def get_coach(coach_id):
    coach = Coach.query.get(coach_id)

    if coach is None:
        return jsonify({"error": "Coach not found"}), 404

    return jsonify(coach.serialize()), 200


@api.route("/coaches/<int:coach_id>/availability", methods=["GET"])
def get_coach_availability(coach_id):
    coach = Coach.query.get(coach_id)

    if coach is None:
        return jsonify({"error": "Coach not found"}), 404

    selected_date_param = request.args.get("date")

    if selected_date_param:
        selected_date = parse_date(selected_date_param)
    else:
        selected_date = datetime.today().date()

    week_start = selected_date - timedelta(days=selected_date.weekday())

    slot_starts = [
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
        "23:00",
    ]

    week_days = []

    for day_index in range(7):
        current_date = week_start + timedelta(days=day_index)

        reservations = ClassReservation.query.filter_by(
            coach_id=coach_id,
            date=current_date,
        ).all()

        slots = []

        for slot_start_string in slot_starts:
            slot_start = parse_time(slot_start_string)

            if slot_start_string == "23:00":
                slot_end = parse_time("00:00")
            else:
                slot_end_hour = int(slot_start_string.split(":")[0]) + 1
                slot_end = parse_time(f"{slot_end_hour:02d}:00")

            is_available = True

            for reservation in reservations:
                if time_ranges_overlap(
                    slot_start,
                    slot_end,
                    reservation.start_time,
                    reservation.end_time,
                ):
                    is_available = False
                    break

            slots.append({
                "start_time": slot_start.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "available": is_available,
            })

        week_days.append({
            "date": current_date.isoformat(),
            "day_name": current_date.strftime("%A"),
            "slots": slots,
        })

    return jsonify({
        "coach_id": coach.id,
        "coach_name": coach.name,
        "week_start": week_start.isoformat(),
        "days": week_days,
    }), 200


@api.route("/coaches", methods=["POST"])
def create_coach():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    if not data.get("name"):
        return jsonify({"error": "Coach name is required"}), 400

    coach = Coach(
        name=data.get("name"),
        bio=data.get("bio"),
        level=data.get("level"),
        price_private=data.get("price_private", 40),
        price_group=data.get("price_group", 15),
        is_active=data.get("is_active", True),
    )

    db.session.add(coach)
    db.session.commit()

    return jsonify(coach.serialize()), 201


@api.route("/coaches/<int:coach_id>", methods=["PUT"])
def update_coach(coach_id):
    coach = Coach.query.get(coach_id)

    if coach is None:
        return jsonify({"error": "Coach not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    coach.name = data.get("name", coach.name)
    coach.bio = data.get("bio", coach.bio)
    coach.level = data.get("level", coach.level)
    coach.price_private = data.get("price_private", coach.price_private)
    coach.price_group = data.get("price_group", coach.price_group)
    coach.is_active = data.get("is_active", coach.is_active)

    db.session.commit()

    return jsonify(coach.serialize()), 200


@api.route("/coaches/<int:coach_id>", methods=["DELETE"])
def delete_coach(coach_id):
    coach = Coach.query.get(coach_id)

    if coach is None:
        return jsonify({"error": "Coach not found"}), 404

    db.session.delete(coach)
    db.session.commit()

    return jsonify({"message": "Coach deleted successfully"}), 200


# -------------------------
# CLASS RESERVATIONS
# -------------------------

@api.route("/class-reservations", methods=["GET"])
def get_class_reservations():
    reservations = ClassReservation.query.all()
    return jsonify([reservation.serialize() for reservation in reservations]), 200


@api.route("/class-reservations", methods=["POST"])
def create_class_reservation():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    required_fields = [
        "user_id",
        "coach_id",
        "date",
        "start_time",
        "end_time",
        "class_type",
    ]

    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    user = User.query.get(data.get("user_id"))

    if user is None:
        return jsonify({"error": "User not found"}), 404

    coach = Coach.query.get(data.get("coach_id"))

    if coach is None:
        return jsonify({"error": "Coach not found"}), 404

    class_date = parse_date(data.get("date"))
    start_time = parse_time(data.get("start_time"))
    end_time = parse_time(data.get("end_time"))

    if end_time <= start_time:
        return jsonify({
            "error": "La hora de fin debe ser posterior a la hora de inicio"
        }), 400

    existing_classes = ClassReservation.query.filter_by(
        coach_id=data.get("coach_id"),
        date=class_date,
    ).all()

    for existing_class in existing_classes:
        if time_ranges_overlap(
            start_time,
            end_time,
            existing_class.start_time,
            existing_class.end_time,
        ):
            return jsonify({
                "error": "Este profesor ya tiene una clase reservada en ese horario"
            }), 400

    reservation = ClassReservation(
        user_id=data.get("user_id"),
        coach_id=data.get("coach_id"),
        date=class_date,
        start_time=start_time,
        end_time=end_time,
        class_type=data.get("class_type"),
        level=data.get("level"),
        price=data.get("price", 0),
        status="confirmed",
    )

    db.session.add(reservation)
    db.session.commit()

    return jsonify(reservation.serialize()), 201


@api.route("/class-reservations/<int:reservation_id>", methods=["DELETE"])
def delete_class_reservation(reservation_id):
    reservation = ClassReservation.query.get(reservation_id)

    if reservation is None:
        return jsonify({"error": "Class reservation not found"}), 404

    db.session.delete(reservation)
    db.session.commit()

    return jsonify({"message": "Class reservation deleted successfully"}), 200


# -------------------------
# TOURNAMENTS
# -------------------------

@api.route("/tournaments", methods=["GET"])
def get_tournaments():
    tournaments = Tournament.query.all()
    return jsonify([tournament.serialize() for tournament in tournaments]), 200


@api.route("/tournaments/<int:tournament_id>", methods=["GET"])
def get_tournament(tournament_id):
    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    return jsonify(tournament.serialize()), 200


@api.route("/tournaments", methods=["POST"])
def create_tournament():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    required_fields = ["name", "date", "max_players"]

    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    tournament = Tournament(
        name=data.get("name"),
        date=parse_date(data.get("date")),
        category=data.get("category"),
        level=data.get("level"),
        max_players=data.get("max_players"),
        price=data.get("price", 0),
        status=data.get("status", "open"),
        description=data.get("description"),
    )

    db.session.add(tournament)
    db.session.commit()

    return jsonify(tournament.serialize()), 201


@api.route("/tournaments/<int:tournament_id>", methods=["PUT"])
def update_tournament(tournament_id):
    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    tournament.name = data.get("name", tournament.name)

    if data.get("date"):
        tournament.date = parse_date(data.get("date"))

    tournament.category = data.get("category", tournament.category)
    tournament.level = data.get("level", tournament.level)
    tournament.max_players = data.get("max_players", tournament.max_players)
    tournament.price = data.get("price", tournament.price)
    tournament.status = data.get("status", tournament.status)
    tournament.description = data.get("description", tournament.description)

    db.session.commit()

    return jsonify(tournament.serialize()), 200


@api.route("/tournaments/<int:tournament_id>", methods=["DELETE"])
def delete_tournament(tournament_id):
    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    db.session.delete(tournament)
    db.session.commit()

    return jsonify({"message": "Tournament deleted successfully"}), 200


@api.route("/tournaments/<int:tournament_id>/join", methods=["POST"])
def join_tournament(tournament_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    if not data.get("user_id"):
        return jsonify({"error": "user_id is required"}), 400

    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    user = User.query.get(data.get("user_id"))

    if user is None:
        return jsonify({"error": "User not found"}), 404

    if len(tournament.registrations) >= tournament.max_players:
        return jsonify({"error": "Tournament is full"}), 400

    existing_registration = TournamentRegistration.query.filter_by(
        tournament_id=tournament_id,
        user_id=data.get("user_id"),
    ).first()

    if existing_registration:
        return jsonify({"error": "User already registered in this tournament"}), 400

    registration = TournamentRegistration(
        tournament_id=tournament_id,
        user_id=data.get("user_id"),
        partner_name=data.get("partner_name"),
        status="registered",
    )

    db.session.add(registration)
    db.session.commit()

    return jsonify(registration.serialize()), 201


# -------------------------
# RANKING
# -------------------------

@api.route("/ranking", methods=["GET"])
def get_ranking():
    ranking = Ranking.query.order_by(Ranking.points.desc()).all()
    return jsonify([item.serialize() for item in ranking]), 200


@api.route("/ranking", methods=["POST"])
def create_ranking_player():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    if not data.get("user_id"):
        return jsonify({"error": "user_id is required"}), 400

    user = User.query.get(data.get("user_id"))

    if user is None:
        return jsonify({"error": "User not found"}), 404

    existing_ranking = Ranking.query.filter_by(user_id=data.get("user_id")).first()

    if existing_ranking:
        return jsonify({"error": "User already exists in ranking"}), 400

    ranking_player = Ranking(
        user_id=data.get("user_id"),
        points=data.get("points", 0),
        matches_played=data.get("matches_played", 0),
        wins=data.get("wins", 0),
        losses=data.get("losses", 0),
    )

    db.session.add(ranking_player)
    db.session.commit()

    return jsonify(ranking_player.serialize()), 201


@api.route("/ranking/<int:ranking_id>", methods=["PUT"])
def update_ranking_player(ranking_id):
    ranking_player = Ranking.query.get(ranking_id)

    if ranking_player is None:
        return jsonify({"error": "Ranking player not found"}), 404

    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    ranking_player.points = data.get("points", ranking_player.points)
    ranking_player.matches_played = data.get(
        "matches_played",
        ranking_player.matches_played,
    )
    ranking_player.wins = data.get("wins", ranking_player.wins)
    ranking_player.losses = data.get("losses", ranking_player.losses)

    db.session.commit()

    return jsonify(ranking_player.serialize()), 200


@api.route("/ranking/<int:ranking_id>", methods=["DELETE"])
def delete_ranking_player(ranking_id):
    ranking_player = Ranking.query.get(ranking_id)

    if ranking_player is None:
        return jsonify({"error": "Ranking player not found"}), 404

    db.session.delete(ranking_player)
    db.session.commit()

    return jsonify({"message": "Ranking player deleted successfully"}), 200