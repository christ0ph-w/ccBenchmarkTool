from flask import Flask
from flask_cors import CORS
from app.controllers import ClusteringController

import logging


def create_app():
    app = Flask(__name__)

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Enable CORS for all routes
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": False
        }
    })

    clustering_controller = ClusteringController()
    
    app.add_url_rule(
        '/api/cluster/traces',
        view_func=clustering_controller.cluster_traces,
        methods=['POST']
    )
    
    #---------------------
    #----- endpoints -----
    #---------------------
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return {
            'status': 'healthy',
            'service': 'Trace Clustering API',
            'version': '1.0.0'
        }, 200
    
    @app.route('/', methods=['GET'])
    def root():
        return {
            'message': 'Trace Clustering API',
            'endpoints': {
                'health': '/api/health (GET)',
                'cluster': '/api/cluster/traces (POST)'
            }
        }, 200
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)