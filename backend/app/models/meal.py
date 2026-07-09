from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class MealType(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class MealEntry(Base):
    __tablename__ = "meal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    meal_type = Column(Enum(MealType), nullable=False)
    notes = Column(Text, nullable=True)
    logged_at = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="meal_entries")
    items = relationship("MealItem", back_populates="meal", cascade="all, delete-orphan")

    @property
    def total_calories(self):
        return sum(item.calories or 0 for item in self.items)

    @property
    def total_protein(self):
        return sum(item.protein_g or 0 for item in self.items)

    @property
    def total_carbs(self):
        return sum(item.carbs_g or 0 for item in self.items)

    @property
    def total_fat(self):
        return sum(item.fat_g or 0 for item in self.items)


class MealItem(Base):
    __tablename__ = "meal_items"

    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meal_entries.id"), nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(String, nullable=True)
    calories = Column(Integer, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)

    meal = relationship("MealEntry", back_populates="items")
