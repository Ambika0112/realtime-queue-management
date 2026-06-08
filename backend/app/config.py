from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
  APP_NAME: str
  APP_ENV: str
  SECRET_KEY: str
  DATABASE_URL: str
  REDIS_URL: str
  FRONTEND_URL: str = "http://localhost:3000"
  
  model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
