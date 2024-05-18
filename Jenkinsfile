pipeline {
    agent any

    stages {
         stage('Checkout') {
            steps {
                checkout scm
            }
        }

    stage('Build and Deploy') {
            steps {
                script {
                    bat 'docker-compose -f docker-compose.yml build'
                    bat 'docker-compose -f docker-compose.yml up -d'
                }
            }
        }
    
        stage('Start Docker containers') {
            steps {
                sh 'docker-compose up -d'
            }
        }
    }
    
     post {
            always {
                script{
                    bat "docker image prune -f"
                }
            }
      }
}
