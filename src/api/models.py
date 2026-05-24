from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, ForeignKey, Date, Time, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date, time

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    name: Mapped[str] = mapped_column(String(120), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="player")
    level: Mapped[str] = mapped_column(String(50), nullable=True)

    court_reservations = relationship("CourtReservation", back_populates="user")
    class_reservations = relationship("ClassReservation", back_populates="user")
    tournament_registrations = relationship("TournamentRegistration", back_populates="user")
    ranking = relationship("Ranking", back_populates="user", uselist=False)

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

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    court_type: Mapped[str] = mapped_column(String(80), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    price_per_hour: Mapped[float] = mapped_column(Float, nullable=False, default=20)

    reservations = relationship("CourtReservation", back_populates="court")

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "court_type": self.court_type,
            "is_active": self.is_active,
            "price_per_hour": self.price_per_hour,
        }


class CourtReservation(db.Model):
    __tablename__ = "court_reservation"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    court_id: Mapped[int] = mapped_column(ForeignKey("court.id"), nullable=False)

    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    status: Mapped[str] = mapped_column(String(50), nullable=False, default="confirmed")
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    user = relationship("User", back_populates="court_reservations")
    court = relationship("Court", back_populates="reservations")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "court_id": self.court_id,
            "court": self.court.serialize() if self.court else None,
            "date": self.date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "status": self.status,
            "price": self.price,
        }


class Coach(db.Model):
    __tablename__ = "coach"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    bio: Mapped[str] = mapped_column(String(255), nullable=True)
    level: Mapped[str] = mapped_column(String(80), nullable=True)
    price_private: Mapped[float] = mapped_column(Float, nullable=False, default=40)
    price_group: Mapped[float] = mapped_column(Float, nullable=False, default=15)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)

    class_reservations = relationship("ClassReservation", back_populates="coach")

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

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coach.id"), nullable=False)

    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    class_type: Mapped[str] = mapped_column(String(80), nullable=False)
    level: Mapped[str] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="confirmed")
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    user = relationship("User", back_populates="class_reservations")
    coach = relationship("Coach", back_populates="class_reservations")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "coach_id": self.coach_id,
            "coach": self.coach.serialize() if self.coach else None,
            "date": self.date.isoformat(),
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "class_type": self.class_type,
            "level": self.level,
            "status": self.status,
            "price": self.price,
        }


class Tournament(db.Model):
    __tablename__ = "tournament"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=True)
    level: Mapped[str] = mapped_column(String(80), nullable=True)
    max_players: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="open")
    description: Mapped[str] = mapped_column(String(255), nullable=True)

    registrations = relationship("TournamentRegistration", back_populates="tournament")

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "date": self.date.isoformat(),
            "category": self.category,
            "level": self.level,
            "max_players": self.max_players,
            "price": self.price,
            "status": self.status,
            "description": self.description,
            "registered_players": len(self.registrations),
        }


class TournamentRegistration(db.Model):
    __tablename__ = "tournament_registration"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(ForeignKey("tournament.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    partner_name: Mapped[str] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="registered")

    tournament = relationship("Tournament", back_populates="registrations")
    user = relationship("User", back_populates="tournament_registrations")

    def serialize(self):
        return {
            "id": self.id,
            "tournament_id": self.tournament_id,
            "user_id": self.user_id,
            "partner_name": self.partner_name,
            "status": self.status,
        }


class Ranking(db.Model):
    __tablename__ = "ranking"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"), nullable=False)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="ranking")

    def serialize(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "player": self.user.name if self.user else None,
            "points": self.points,
            "matches_played": self.matches_played,
            "wins": self.wins,
            "losses": self.losses,
        }