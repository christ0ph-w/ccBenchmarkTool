from pathlib import Path

class Config:
    # Project root - backend-flask/
    PROJECT_ROOT = Path(__file__).parent
    
    # Data directory - PROJECT_ROOT.parent leads to ccBenchmarkTool
    DATA_ROOT = PROJECT_ROOT.parent / "data"
    
    # Ensure data directory exists
    DATA_ROOT.mkdir(parents=True, exist_ok=True)

    @classmethod
    def get_absolute_data_path(cls, relative_path: str) -> Path:
        return cls.DATA_ROOT / relative_path