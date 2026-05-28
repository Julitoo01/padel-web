import random
from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token
from sqlalchemy.orm.attributes import flag_modified

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

CLASS_PRICE = 360


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


def get_or_create_ranking(user_id):
    ranking_player = Ranking.query.filter_by(user_id=user_id).first()

    if not ranking_player:
        ranking_player = Ranking(
            user_id=user_id,
            points=0,
            matches_played=0,
            wins=0,
            losses=0,
        )
        db.session.add(ranking_player)
        db.session.flush()

    return ranking_player


def build_tournament_teams(tournament_id):
    registrations = TournamentRegistration.query.filter_by(
        tournament_id=tournament_id
    ).all()

    used_user_ids = set()
    teams = []

    for registration in registrations:
        if registration.user_id in used_user_ids:
            continue

        player_1 = User.query.get(registration.user_id)

        if not player_1:
            continue

        player_1_name = player_1.name or player_1.email
        partner_registration = None

        for possible_partner in registrations:
            if possible_partner.user_id == registration.user_id:
                continue

            if possible_partner.user_id in used_user_ids:
                continue

            possible_partner_user = User.query.get(possible_partner.user_id)

            if not possible_partner_user:
                continue

            possible_partner_name = (
                possible_partner_user.name or possible_partner_user.email
            )

            if (
                registration.partner_name == possible_partner_name
                and possible_partner.partner_name == player_1_name
            ):
                partner_registration = possible_partner
                break

        if partner_registration:
            player_2 = User.query.get(partner_registration.user_id)

            if not player_2:
                continue

            player_2_name = player_2.name or player_2.email

            teams.append({
                "team_id": f"{player_1.id}-{player_2.id}",
                "player_1_id": player_1.id,
                "player_1": player_1_name,
                "player_2_id": player_2.id,
                "player_2": player_2_name,
                "label": f"{player_1_name} / {player_2_name}",
                "status": registration.status,
            })

            used_user_ids.add(player_1.id)
            used_user_ids.add(player_2.id)

    return teams


def next_power_of_two(number):
    power = 1

    while power < number:
        power *= 2

    return power


def get_round_name(teams_in_round):
    if teams_in_round == 2:
        return "Final"

    return f"1/{teams_in_round // 2}"


def generate_bracket(teams):
    shuffled_teams = teams[:]
    random.shuffle(shuffled_teams)

    original_team_count = len(shuffled_teams)
    bracket_size = next_power_of_two(original_team_count)

    while len(shuffled_teams) < bracket_size:
        shuffled_teams.append({
            "team_id": f"bye-{len(shuffled_teams)}",
            "player_1_id": None,
            "player_1": "BYE",
            "player_2_id": None,
            "player_2": "",
            "label": "BYE",
            "status": "bye",
        })

    rounds = []

    first_round_matches = []
    match_number = 1

    for index in range(0, len(shuffled_teams), 2):
        team_1 = shuffled_teams[index]
        team_2 = shuffled_teams[index + 1]

        winner = None

        if team_1.get("status") != "bye" and team_2.get("status") == "bye":
            winner = team_1

        if team_1.get("status") == "bye" and team_2.get("status") != "bye":
            winner = team_2

        first_round_matches.append({
            "match_id": f"R1-M{match_number}",
            "team_1": team_1,
            "team_2": team_2,
            "winner": winner,
        })

        match_number += 1

    rounds.append({
        "name": get_round_name(bracket_size),
        "matches": first_round_matches,
    })

    teams_in_round = bracket_size // 2
    round_index = 2

    while teams_in_round >= 2:
        matches = []

        for match_index in range(teams_in_round // 2):
            matches.append({
                "match_id": f"R{round_index}-M{match_index + 1}",
                "team_1": None,
                "team_2": None,
                "winner": None,
            })

        rounds.append({
            "name": get_round_name(teams_in_round),
            "matches": matches,
        })

        teams_in_round //= 2
        round_index += 1

    bracket = {
        "total_teams": original_team_count,
        "bracket_size": bracket_size,
        "rounds": rounds,
        "champion": None,
    }

    advance_bye_winners(bracket)

    return bracket


def advance_bye_winners(bracket):
    rounds = bracket.get("rounds", [])

    for round_index, round_data in enumerate(rounds):
        is_final_round = round_index == len(rounds) - 1

        for match_index, match in enumerate(round_data.get("matches", [])):
            winner = match.get("winner")

            if not winner:
                continue

            if is_final_round:
                bracket["champion"] = winner
                continue

            next_round_index = round_index + 1
            next_match_index = match_index // 2

            next_match = rounds[next_round_index]["matches"][next_match_index]

            if match_index % 2 == 0:
                if next_match.get("team_1") is None:
                    next_match["team_1"] = winner
            else:
                if next_match.get("team_2") is None:
                    next_match["team_2"] = winner


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

    ranking_player = Ranking(
        user_id=user.id,
        points=0,
        matches_played=0,
        wins=0,
        losses=0,
    )

    db.session.add(ranking_player)
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

    ranking_player = Ranking(
        user_id=user.id,
        points=0,
        matches_played=0,
        wins=0,
        losses=0,
    )

    db.session.add(ranking_player)
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

    if data.get("password"):
        user.password = generate_password_hash(data.get("password"))

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

    ranking_player = Ranking.query.filter_by(user_id=user_id).first()

    if ranking_player:
        db.session.delete(ranking_player)

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


@api.route("/courts/<int:court_id>/availability", methods=["GET"])
def get_court_availability(court_id):
    court = Court.query.get(court_id)

    if court is None:
        return jsonify({"error": "Court not found"}), 404

    selected_date_param = request.args.get("date")

    if selected_date_param:
        selected_date = parse_date(selected_date_param)
    else:
        selected_date = datetime.today().date()

    week_start = selected_date - timedelta(days=selected_date.weekday())

    court_slots = [
        ("16:00", "17:30"),
        ("17:30", "19:00"),
        ("19:00", "20:30"),
        ("20:30", "22:00"),
        ("22:00", "23:30"),
        ("23:30", "01:00"),
        ("01:00", "02:30"),
    ]

    week_days = []

    for day_index in range(7):
        current_date = week_start + timedelta(days=day_index)
        slots = []

        for slot_start_string, slot_end_string in court_slots:
            slot_start = parse_time(slot_start_string)
            slot_end = parse_time(slot_end_string)

            if slot_start_string in ["00:00", "00:30", "01:00", "01:30", "02:00"]:
                slot_date = current_date + timedelta(days=1)
            else:
                slot_date = current_date

            slot_start_datetime = datetime.combine(slot_date, slot_start)
            slot_end_datetime = datetime.combine(slot_date, slot_end)

            if slot_end <= slot_start:
                slot_end_datetime = slot_end_datetime + timedelta(days=1)

            candidate_start_date = slot_start_datetime.date() - timedelta(days=1)
            candidate_end_date = slot_end_datetime.date()

            reservations = CourtReservation.query.filter(
                CourtReservation.court_id == court_id,
                CourtReservation.date >= candidate_start_date,
                CourtReservation.date <= candidate_end_date,
            ).all()

            is_available = True

            for reservation in reservations:
                reservation_start_datetime = datetime.combine(
                    reservation.date,
                    reservation.start_time,
                )

                reservation_end_datetime = datetime.combine(
                    reservation.date,
                    reservation.end_time,
                )

                if reservation.end_time <= reservation.start_time:
                    reservation_end_datetime = reservation_end_datetime + timedelta(days=1)

                overlaps = (
                    slot_start_datetime < reservation_end_datetime
                    and slot_end_datetime > reservation_start_datetime
                )

                if overlaps:
                    is_available = False
                    break

            slots.append({
                "date": slot_date.isoformat(),
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
        "court_id": court.id,
        "court_name": court.name,
        "week_start": week_start.isoformat(),
        "days": week_days,
    }), 200


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

    reservation_start_datetime = datetime.combine(reservation_date, start_time)
    reservation_end_datetime = datetime.combine(reservation_date, end_time)

    if end_time <= start_time:
        reservation_end_datetime = reservation_end_datetime + timedelta(days=1)

    if reservation_start_datetime < datetime.now():
        return jsonify({
            "error": "No se pueden reservar pistas en fechas u horas pasadas"
        }), 400

    duration_minutes = int(
        (reservation_end_datetime - reservation_start_datetime).total_seconds() / 60
    )

    if duration_minutes != 90:
        return jsonify({
            "error": "Las reservas de pista deben ser de 1 hora y media"
        }), 400

    allowed_slots = [
        ("16:00", "17:30"),
        ("17:30", "19:00"),
        ("19:00", "20:30"),
        ("20:30", "22:00"),
        ("22:00", "23:30"),
        ("23:30", "01:00"),
        ("01:00", "02:30"),
    ]

    selected_slot = (
        start_time.strftime("%H:%M"),
        end_time.strftime("%H:%M"),
    )

    if selected_slot not in allowed_slots:
        return jsonify({
            "error": "Horario no permitido. Las pistas se reservan en bloques de 1h30 entre 16:00 y 02:30"
        }), 400

    candidate_start_date = reservation_start_datetime.date() - timedelta(days=1)
    candidate_end_date = reservation_end_datetime.date()

    existing_reservations = CourtReservation.query.filter(
        CourtReservation.court_id == data.get("court_id"),
        CourtReservation.date >= candidate_start_date,
        CourtReservation.date <= candidate_end_date,
    ).all()

    for existing_reservation in existing_reservations:
        existing_start_datetime = datetime.combine(
            existing_reservation.date,
            existing_reservation.start_time,
        )

        existing_end_datetime = datetime.combine(
            existing_reservation.date,
            existing_reservation.end_time,
        )

        if existing_reservation.end_time <= existing_reservation.start_time:
            existing_end_datetime = existing_end_datetime + timedelta(days=1)

        overlaps = (
            reservation_start_datetime < existing_end_datetime
            and reservation_end_datetime > existing_start_datetime
        )

        if overlaps:
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
        price_private=CLASS_PRICE,
        price_group=CLASS_PRICE,
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
    coach.price_private = CLASS_PRICE
    coach.price_group = CLASS_PRICE
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

    class_datetime = datetime.combine(class_date, start_time)

    if class_datetime < datetime.now():
        return jsonify({
            "error": "No se pueden reservar clases en fechas u horas pasadas"
        }), 400

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
        price=CLASS_PRICE,
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
        bracket=None,
        bracket_generated_at=None,
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


@api.route("/tournaments/<int:tournament_id>/close", methods=["PUT"])
def close_tournament(tournament_id):
    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    if tournament.status == "closed" and tournament.bracket:
        return jsonify({
            "message": "Tournament already closed. Bracket already generated.",
            "tournament": tournament.serialize(),
            "bracket": tournament.bracket,
        }), 200

    teams = build_tournament_teams(tournament_id)

    if len(teams) < 2:
        return jsonify({
            "error": "No hay suficientes parejas para cerrar el torneo y generar el cuadro"
        }), 400

    bracket = generate_bracket(teams)

    tournament.status = "closed"
    tournament.bracket = bracket
    tournament.bracket_generated_at = datetime.now()

    db.session.commit()

    return jsonify({
        "message": "Tournament closed and bracket generated successfully",
        "tournament": tournament.serialize(),
        "bracket": tournament.bracket,
    }), 200


@api.route("/tournaments/<int:tournament_id>/bracket", methods=["GET"])
def get_tournament_bracket(tournament_id):
    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    if tournament.status != "closed":
        return jsonify({
            "error": "El cuadro estará disponible cuando se cierren las inscripciones"
        }), 403

    if not tournament.bracket:
        teams = build_tournament_teams(tournament_id)

        if len(teams) < 2:
            return jsonify({
                "error": "No hay suficientes parejas para generar el cuadro"
            }), 400

        tournament.bracket = generate_bracket(teams)
        tournament.bracket_generated_at = datetime.now()
        db.session.commit()

    return jsonify({
        "tournament": tournament.serialize(),
        "total_teams": tournament.bracket.get("total_teams", 0),
        "bracket_size": tournament.bracket.get("bracket_size", 0),
        "rounds": tournament.bracket.get("rounds", []),
        "champion": tournament.bracket.get("champion"),
        "bracket_generated_at": tournament.bracket_generated_at.isoformat()
        if tournament.bracket_generated_at else None,
    }), 200


@api.route("/tournaments/<int:tournament_id>/bracket/matches/<match_id>/winner", methods=["PUT"])
def update_bracket_match_winner(tournament_id, match_id):
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    winner_team_id = data.get("winner_team_id")
    admin_id = data.get("admin_id")

    if not winner_team_id:
        return jsonify({"error": "winner_team_id is required"}), 400

    if not admin_id:
        return jsonify({"error": "admin_id is required"}), 400

    admin_user = User.query.get(admin_id)

    if admin_user is None:
        return jsonify({"error": "Admin user not found"}), 404

    if admin_user.role != "admin":
        return jsonify({
            "error": "Solo el admin puede introducir resultados del torneo"
        }), 403

    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    if tournament.status != "closed":
        return jsonify({
            "error": "Solo se pueden actualizar resultados cuando el torneo está cerrado"
        }), 400

    if not tournament.bracket:
        return jsonify({"error": "El torneo no tiene cuadro generado"}), 400

    bracket = tournament.bracket
    rounds = bracket.get("rounds", [])

    current_round_index = None
    current_match_index = None
    current_match = None

    for round_index, round_data in enumerate(rounds):
        for match_index, match in enumerate(round_data.get("matches", [])):
            if match.get("match_id") == match_id:
                current_round_index = round_index
                current_match_index = match_index
                current_match = match
                break

        if current_match:
            break

    if current_match is None:
        return jsonify({"error": "Match not found in bracket"}), 404

    team_1 = current_match.get("team_1")
    team_2 = current_match.get("team_2")

    valid_winner = None

    if team_1 and team_1.get("team_id") == winner_team_id:
        valid_winner = team_1

    if team_2 and team_2.get("team_id") == winner_team_id:
        valid_winner = team_2

    if valid_winner is None:
        return jsonify({
            "error": "winner_team_id no pertenece a este partido"
        }), 400

    current_match["winner"] = valid_winner

    is_final_round = current_round_index == len(rounds) - 1

    if not is_final_round:
        next_round_index = current_round_index + 1
        next_match_index = current_match_index // 2

        next_match = rounds[next_round_index]["matches"][next_match_index]

        if current_match_index % 2 == 0:
            next_match["team_1"] = valid_winner
        else:
            next_match["team_2"] = valid_winner
    else:
        bracket["champion"] = valid_winner

    tournament.bracket = bracket
    flag_modified(tournament, "bracket")
    db.session.commit()

    return jsonify({
        "message": "Resultado actualizado correctamente",
        "tournament": tournament.serialize(),
        "bracket": tournament.bracket,
    }), 200


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

    if not data.get("partner_id"):
        return jsonify({"error": "partner_id is required"}), 400

    user_id = int(data.get("user_id"))
    partner_id = int(data.get("partner_id"))

    if user_id == partner_id:
        return jsonify({
            "error": "No puedes inscribirte contigo mismo como pareja"
        }), 400

    tournament = Tournament.query.get(tournament_id)

    if tournament is None:
        return jsonify({"error": "Tournament not found"}), 404

    if tournament.status != "open":
        return jsonify({"error": "Tournament is not open"}), 400

    user = User.query.get(user_id)

    if user is None:
        return jsonify({"error": "User not found"}), 404

    partner = User.query.get(partner_id)

    if partner is None:
        return jsonify({"error": "Partner user not found"}), 404

    current_registered = len(tournament.registrations)

    if current_registered + 2 > tournament.max_players:
        return jsonify({
            "error": "No hay plazas suficientes para inscribir a la pareja"
        }), 400

    existing_user_registration = TournamentRegistration.query.filter_by(
        tournament_id=tournament_id,
        user_id=user_id,
    ).first()

    if existing_user_registration:
        return jsonify({
            "error": "Ya estás inscrito en este torneo"
        }), 400

    existing_partner_registration = TournamentRegistration.query.filter_by(
        tournament_id=tournament_id,
        user_id=partner_id,
    ).first()

    if existing_partner_registration:
        return jsonify({
            "error": "Tu pareja ya está inscrita en este torneo"
        }), 400

    user_registration = TournamentRegistration(
        tournament_id=tournament_id,
        user_id=user_id,
        partner_name=partner.name or partner.email,
        status="registered",
    )

    partner_registration = TournamentRegistration(
        tournament_id=tournament_id,
        user_id=partner_id,
        partner_name=user.name or user.email,
        status="registered",
    )

    db.session.add(user_registration)
    db.session.add(partner_registration)
    db.session.commit()

    return jsonify({
        "message": "Pareja inscrita correctamente",
        "players": [
            user.serialize(),
            partner.serialize(),
        ],
    }), 201


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


@api.route("/ranking/sync", methods=["POST"])
def sync_ranking():
    users = User.query.all()
    created = 0

    for user in users:
        existing_ranking = Ranking.query.filter_by(user_id=user.id).first()

        if not existing_ranking:
            ranking_player = Ranking(
                user_id=user.id,
                points=0,
                matches_played=0,
                wins=0,
                losses=0,
            )

            db.session.add(ranking_player)
            created += 1

    db.session.commit()

    return jsonify({
        "message": "Ranking synced successfully",
        "created": created,
    }), 200


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


# -------------------------
# MATCH RESULTS
# -------------------------

@api.route("/matches/result", methods=["POST"])
def upload_match_result():
    data = request.get_json()

    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    required_fields = [
        "team1_drive_id",
        "team1_left_id",
        "team2_drive_id",
        "team2_left_id",
        "set1_team1",
        "set1_team2",
        "set2_team1",
        "set2_team2",
    ]

    for field in required_fields:
        if data.get(field) is None or data.get(field) == "":
            return jsonify({"error": f"{field} is required"}), 400

    team1_drive_id = int(data.get("team1_drive_id"))
    team1_left_id = int(data.get("team1_left_id"))
    team2_drive_id = int(data.get("team2_drive_id"))
    team2_left_id = int(data.get("team2_left_id"))

    player_ids = [
        team1_drive_id,
        team1_left_id,
        team2_drive_id,
        team2_left_id,
    ]

    if len(player_ids) != len(set(player_ids)):
        return jsonify({
            "error": "No puedes repetir jugadores en el mismo partido"
        }), 400

    players = User.query.filter(User.id.in_(player_ids)).all()

    if len(players) != 4:
        return jsonify({"error": "Alguno de los jugadores no existe"}), 404

    set1_team1 = int(data.get("set1_team1"))
    set1_team2 = int(data.get("set1_team2"))
    set2_team1 = int(data.get("set2_team1"))
    set2_team2 = int(data.get("set2_team2"))

    team1_sets = 0
    team2_sets = 0

    if set1_team1 > set1_team2:
        team1_sets += 1
    elif set1_team2 > set1_team1:
        team2_sets += 1
    else:
        return jsonify({"error": "Un set no puede acabar empatado"}), 400

    if set2_team1 > set2_team2:
        team1_sets += 1
    elif set2_team2 > set2_team1:
        team2_sets += 1
    else:
        return jsonify({"error": "Un set no puede acabar empatado"}), 400

    if team1_sets == 1 and team2_sets == 1:
        if data.get("set3_team1") is None or data.get("set3_team1") == "":
            return jsonify({
                "error": "Se necesita Set 3 porque cada equipo ganó un set"
            }), 400

        if data.get("set3_team2") is None or data.get("set3_team2") == "":
            return jsonify({
                "error": "Se necesita Set 3 porque cada equipo ganó un set"
            }), 400

        set3_team1 = int(data.get("set3_team1"))
        set3_team2 = int(data.get("set3_team2"))

        if set3_team1 > set3_team2:
            team1_sets += 1
        elif set3_team2 > set3_team1:
            team2_sets += 1
        else:
            return jsonify({"error": "Un set no puede acabar empatado"}), 400

    if team1_sets > team2_sets:
        winner_ids = [team1_drive_id, team1_left_id]
        loser_ids = [team2_drive_id, team2_left_id]
        winner_team = "Equipo 1"
    else:
        winner_ids = [team2_drive_id, team2_left_id]
        loser_ids = [team1_drive_id, team1_left_id]
        winner_team = "Equipo 2"

    for user_id in winner_ids:
        ranking_player = get_or_create_ranking(user_id)
        ranking_player.points += 10
        ranking_player.matches_played += 1
        ranking_player.wins += 1

    for user_id in loser_ids:
        ranking_player = get_or_create_ranking(user_id)
        ranking_player.points += 2
        ranking_player.matches_played += 1
        ranking_player.losses += 1

    db.session.commit()

    return jsonify({
        "message": "Resultado subido correctamente",
        "winner_team": winner_team,
        "team1_sets": team1_sets,
        "team2_sets": team2_sets,
    }), 201