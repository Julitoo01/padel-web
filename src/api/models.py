from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    name = db.Column(db.String(120), nullable=True)
    role = db.Column(db.String(50), default="player")
    level = db.Column(db.String(80), nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    court_reservations = db.relationship(
        "CourtReservation",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    class_reservations = db.relationship(
        "ClassReservation",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    tournament_registrations = db.relationship(
        "TournamentRegistration",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    ranking = db.relationship(
        "Ranking",
        backref="user",
        lazy=True,
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<User {self.email}>"

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "level": self.level,
            "is_active": self.is_active,
        }


class Court(db.Model):
    __tablename__ = "court"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)
    court_type = db.Column(db.String(80), nullable=True)
    price_per_hour = db.Column(db.Float, default=0)
    is_active = db.Column(db.Boolean, default=True)

    reservations = db.relationship(
        "CourtReservation",
        backref="court",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Court {self.name}>"

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "court_type": self.court_type,
            "price_per_hour": self.price_per_hour,
            "is_active": self.is_active,
        }


class CourtReservation(db.Model):
    __tablename__ = "court_reservation"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    court_id = db.Column(db.Integer, db.ForeignKey("court.id"), nullable=False)

    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    price = db.Column(db.Float, default=0)
    status = db.Column(db.String(50), default="confirmed")

    def __repr__(self):
        return f"<CourtReservation {self.id}>"

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user": self.user.name if self.user and self.user.name else self.user.email if self.user else None,
            "court_id": self.court_id,
            "court": self.court.name if self.court else None,
            "date": self.date.isoformat() if self.date else None,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "price": self.price,
            "status": self.status,
        }


class Coach(db.Model):
    __tablename__ = "coach"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)
    bio = db.Column(db.Text, nullable=True)
    level = db.Column(db.String(80), nullable=True)

    price_private = db.Column(db.Float, default=360)
    price_group = db.Column(db.Float, default=360)

    is_active = db.Column(db.Boolean, default=True)

    class_reservations = db.relationship(
        "ClassReservation",
        backref="coach",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Coach {self.name}>"

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "bio": self.bio,
            "level": self.level,
            "price_private": self.price_private,
            "price_group": self.price_group,
            "is_active": self.is_active,
        }


class ClassReservation(db.Model):
    __tablename__ = "class_reservation"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    coach_id = db.Column(db.Integer, db.ForeignKey("coach.id"), nullable=False)

    date = db.Column(db.Date, nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)

    class_type = db.Column(db.String(50), nullable=False)
    level = db.Column(db.String(80), nullable=True)

    price = db.Column(db.Float, default=360)
    status = db.Column(db.String(50), default="confirmed")

    def __repr__(self):
        return f"<ClassReservation {self.id}>"

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user": self.user.name if self.user and self.user.name else self.user.email if self.user else None,
            "coach_id": self.coach_id,
            "coach": self.coach.name if self.coach else None,
            "date": self.date.isoformat() if self.date else None,
            "start_time": self.start_time.strftime("%H:%M") if self.start_time else None,
            "end_time": self.end_time.strftime("%H:%M") if self.end_time else None,
            "class_type": self.class_type,
            "level": self.level,
            "price": self.price,
            "status": self.status,
        }


class Tournament(db.Model):
    __tablename__ = "tournament"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(120), nullable=False)
    date = db.Column(db.Date, nullable=False)

    category = db.Column(db.String(80), nullable=True)
    level = db.Column(db.String(80), nullable=True)

    max_players = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, default=0)

    status = db.Column(db.String(50), default="open")
    description = db.Column(db.Text, nullable=True)

    # Guarda el cuadro generado una sola vez al cerrar inscripciones
    bracket = db.Column(db.JSON, nullable=True)
    bracket_generated_at = db.Column(db.DateTime, nullable=True)

    registrations = db.relationship(
        "TournamentRegistration",
        backref="tournament",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Tournament {self.name}>"

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "date": self.date.isoformat() if self.date else None,
            "category": self.category,
            "level": self.level,
            "max_players": self.max_players,
            "registered_players": len(self.registrations) if self.registrations else 0,
            "price": self.price,
            "status": self.status,
            "description": self.description,
            "bracket": self.bracket,
            "bracket_generated_at": self.bracket_generated_at.isoformat()
            if self.bracket_generated_at
            else None,
        }


class TournamentRegistration(db.Model):
    __tablename__ = "tournament_registration"

    id = db.Column(db.Integer, primary_key=True)

    tournament_id = db.Column(
        db.Integer,
        db.ForeignKey("tournament.id"),
        nullable=False,
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
    )

    partner_name = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(50), default="registered")

    def __repr__(self):
        return f"<TournamentRegistration {self.id}>"

    def serialize(self):
        return {
            "id": self.id,
            "tournament_id": self.tournament_id,
            "tournament": self.tournament.name if self.tournament else None,
            "user_id": self.user_id,
            "user": self.user.name if self.user and self.user.name else self.user.email if self.user else None,
            "partner_name": self.partner_name,
            "status": self.status,
        }


class Ranking(db.Model):
    __tablename__ = "ranking"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=False,
        unique=True,
    )

    points = db.Column(db.Integer, default=0)
    matches_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)

    def __repr__(self):
        return f"<Ranking user_id={self.user_id}>"

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "player": self.user.name if self.user and self.user.name else self.user.email if self.user else None,
            "points": self.points,
            "matches_played": self.matches_played,
            "wins": self.wins,
            "losses": self.losses,
        }