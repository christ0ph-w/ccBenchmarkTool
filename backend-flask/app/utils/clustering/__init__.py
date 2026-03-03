from .base import BaseClusterer
from .dbscan import DBSCANClusterer
from .hierarchical import HierarchicalClusterer

CLUSTERERS = {
    'dbscan': DBSCANClusterer,
    'hierarchical': HierarchicalClusterer,
}