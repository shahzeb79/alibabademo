#!groovy
sapUserId = 'd066567'
sapUserIdtest = 'd066567'
psApp = "ps-app-ui"
githubUserId = "${sapUserId}"
cfIntegrationSpace = "integration-${sapUserId}"
cfAcceptanceSpace = "acceptance-${sapUserId}"
cfProductionSpace = "production-${sapUserId}"
jobUrl = 'https://prod-build10300.wdf.sap.corp/job/default_1/job/D066567-bulletinboard-ads-SP-MS-common/'

stage('Commit') {
    cleanNode {
        git url: 'git@github.wdf.sap.corp:D066567/bulletinboard-ads.git'
        try {
            stagingCommitId = executeShell 'git rev-parse HEAD'
            
            echo 'Trigger remote job'

            stageBuildHandle = triggerRemoteJob (
                auth: CredentialsAuth(credentials: 'xmakeNova'),
                job: jobUrl,
                parameters: 'MODE=stage\nTREEISH=' + stagingCommitId
            )           
            
        } finally {
            junit allowEmptyResults: true, testResults:'target/surefire-reports/*.xml'
            junit allowEmptyResults: true, testResults:'target/failsafe-reports/*.xml'
        }
        stash includes: 'target/bulletinboard-ads.zip', name: 'ARTIFACTS'
    }
}
stage('Integration') {
    node {

    }
}
stage('Docker build and test') {
    node {
    sh 'docker login -u d066567 -p 4415923'
    def customImage = docker.build("d066567/ps-app-ui:latest")
    customImage.push()
    }
}
stage('Test helm') {
    node {
    sh 'helm version'
    }
}
stage('Delete old helm chart') {
    node {
    sh """
    helm delete --purge ${psApp}
    """
    }
}
stage('Deploy helm chart') {
    node {
    sh """
    helm install --name ${psApp} ./chart/ps-app-ui --namespace development
    """
    }
}
def pushApplication(spaceName) {
	 withCredentials([usernamePassword(credentialsId: 'CF_CREDENTIAL', passwordVariable: 'CF_PASSWORD', usernameVariable: 'CF_USERNAME')])
          {
            sh """
            ruby scripts/simple_blue_green.rb ${cfOrganization} ${spaceName} ${cfApiEndpoint} \${CF_USERNAME} \${CF_PASSWORD}
            """
	    }
}

def cleanNode(block) {
    node {
	env.NODEJS_HOME = "${tool 'node-9.4.0'}"
        env.PATH="${env.NODEJS_HOME}/bin:${env.PATH}"
        deleteDir()
        block()
    }
}

def executeShell(command) {
  def result = sh returnStdout: true, script: command
  return result.trim()
}

def runCentralBuild() {
    try {
	        stagingCommitId = executeShell 'git rev-parse HEAD'
	        echo 'Trigger remote job'
                stageBuildHandle = triggerRemoteJob (
                auth: CredentialsAuth(credentials: 'xmakeNova'),
                job: jobUrl,
                parameters: 'MODE=stage\nTREEISH=' + stagingCommitId
            )
	        echo 'Downloading build/ staging results'
		def stageResults = stageBuildHandle.readJsonFileFromBuildArchive('build-results.json')

		def projectArchiveUrl = stageResults.projectArchive
		echo 'projectArchiveUrl: ' + projectArchiveUrl

		sh """#!/bin/bash -ev
		    curl -fsSL -o projectArchive.tar.gz ${projectArchiveUrl}
		    tar -zxf "projectArchive.tar.gz"
		"""
	        jacoco()
	        pmd canComputeNew: false, defaultEncoding: '', healthy: '', pattern: '', unHealthy: ''
	        findbugs canComputeNew: false, defaultEncoding: '', excludePattern: '', healthy: '', includePattern: '', pattern: '**/findbugsXml.xml', unHealthy: ''
		echo 'Get staging Repository Id and Url'
		stagingRepoId = stageResults.staging_repo_id
		stagingRepoUrl = stageResults.stage_repourl
		echo 'stageRepoId: ' + stagingRepoId
		echo 'stageRepoUrl: ' + stagingRepoUrl
      } finally {
            junit allowEmptyResults: true, testResults: 'target/surefire-reports/*.xml'
            junit allowEmptyResults: true, testResults: 'target/failsafe-reports/*.xml'
        }
}
def automaticVersioning() {
    def baseVersion = executeShell 'mvn -q -Dexec.executable=\'echo\' -Dexec.args=\'${project.version}\' --non-recursive org.codehaus.mojo:exec-maven-plugin:1.3.1:exec'
    def timestamp = executeShell 'date +"%Y%m%d-%H%M%S"'
    def gitRevision = executeShell 'git rev-parse HEAD'
    version = "${baseVersion}-${timestamp}_${gitRevision}"
    sh "mvn -B versions:set -DnewVersion=${version}"
    // Push version and tag to GitHub
    buildTag = "BUILD_${version}"
    sh """
    git add pom.xml
    git commit -m 'update version'
    git tag '${buildTag}'
    git push origin '${buildTag}'
    """
}
