/**
*  STEPS to debug on simulators:
*
*    0. sudo npm install -d (to initialise grunt dependencies)
*       sudo npm install grunt-contrib-jshint --save-dev
 *       
 * iphone-devices: ti build --appify -p ios  -T device --device-id all --pp-uuid "f20b6e77-a3ac-4ddf-85dd-508851452941"  --developer-name "Justin Holloway (QV4AHHCZY3)"
*
*/

module.exports = function(grunt) {
	'use strict';

  var printArgs = function(label) {
      grunt.log.writeln('Arguments for: ' + label);
      grunt.log.writeln('process.argv: ' + JSON.stringify(process.argv));
      grunt.log.writeln('process.execArgv: ' + JSON.stringify(process.execArgv));
  };

	// from VBoxManage list vms
	var genymotion_vms = ["HTC One X - 4.2.2 - API 17 - 720x1280","Samsung Galaxy S5 - 4.4.2 - API 19 - 1080x1920"];

	// UDIDs from ti info -p ios
	var IPHONE5SIM = "4A2C385B-AEC5-44AC-B488-D84618DC23F6";
	var IPHONE6SIM = "9DA1DA07-496D-4C1E-AB66-891509CEE372";

	// Leave blank unless override required
    var BUILDSDK = "--sdk 5.3.0.GA";
	var ADBPARAMS = '-r'; //'-rtd'
	var LIVEDEV = false;  // for followyourfeet, lets always build releases in debug mode for now e.g force --deploy-type development

    // Project Specific Definitions
	var APPNAME = 'FollowYourFeet';        						// from TiApp.xml
	var APPID = 'com.biotelligent.safe2eat';        // from TiApp.xml
	var APKNAME = APPNAME + '.apk';               // from output in build/appify/build/android/bin
	var IPANAME = APPNAME + '.ipa';
	var ACTIVITYNAME = 'FollowyourfeetActivity';       
	var ACTIVITYPATH = APPID + '/.' + ACTIVITYNAME;
	var APKPATH = " ./build/appify/build/android/bin/";

  grunt.initConfig({
      apk_name: 'FollowYourFeet.apk',
    ipa_name: 'FollowYourFeet.ipa',
    ios_family: "universal",
    ios_dev_name: "Justin Holloway (QV4AHHCZY3)",
    ios_dev_profile: "82d0f25a-da5f-4dbd-a7fd-2a005fc2d847",
    ios_adhoc_name: LIVEDEV ? "Justin Holloway (QV4AHHCZY3)" : "Biotelligent Ltd (Z3B5YJH5EM)",
    ios_adhoc_profile: LIVEDEV ? "82d0f25a-da5f-4dbd-a7fd-2a005fc2d847" : "cdc9eb6d-ecb6-420e-9124-44262a54a90b",
    ios_appstore_name: "FollowYourFeet Ltd (UNKNOWN)",
    ios_appstore_profile: "8510c7df-5a19-4310-a6c6-1fe5adaad826",
    android_keystore: "./android_keystore/feet",
    android_keypass: "cheesedogs",
    output_folder: LIVEDEV ? "/Users/justin/Develop/BiotelligentWorkspace/followyourfeet/build/iphone/build/Products/Debug-iphoneos" : "/Users/justin/Develop/IPA",             // use full path - cannot use $HOME or ~
    adb_output_folder: LIVEDEV ? '/Users/justin/Develop/BiotelligentWorkspace/followyourfeet/build/android/bin' : "/Users/justin/Develop/IPA",
    installr_api_key: "26KXK5N4hpNuXN6pq6xQxfNIWkBTOAdm",
    installr_settings: {
      releaseNotes: grunt.file.read("./CHANGELOG.txt")
    },

    jshint: {
      options: {
        force: true, // report errors but don't fail the task
        jshintrc: './.jshintrc'
      },
      all: ['app/lib/**/*.js', 'test/**/*.js']
    },

      availabletasks: {
          tasks: {
              options: {
                  filter: 'exclude',
                  tasks: ['availabletasks', 'tasks']
              }
          }
      },


    // Task Configuration
    "6to5" : {
      options: {
        sourceMap: false
      },
      dist: {
        files: [{
          expand: true,
          src: ['**/*.js'],
          dest: 'app',
          cwd: 'src',
          ext: '.js'
        }]
      }
    },
    tishadow: {
      options: {
        update: true,
      },
      run_android: {
        command: 'run',
        options: {
          platform: 'android'
        }
      },
      run_ios:{
        command: 'run',
        options: {
          platform: 'ios'
        }
      },
      run: {
        command: 'run'
      },
      spec_android: {
        command: 'spec',
        options: {
          update: false,
          platform: ['android'],
        }
      },
      spec_ios:{
        command: 'spec',
        options: {
          update: false,
          platform: ['ios'],
        }
      },
      clear: {
        command: 'clear',
        options: {
        }
      },
      repl: {
        command: 'repl',
        options: {
          projectDir: './'
        }
      }
    },
    // titanium-cli commands in absence of a plugin
    shell: {
      options: {
        stdout: true,
        stderr: true
      },

      // Clearing the console
      clear: {
        options: {
          stdout: true
        },
        command: 'clear'
      },

      // Just a test compile, clearing the console first to check for any errors
      compile: {
        options: {
          stdout: true
        },
        command: 'appc ti build --build-only --platform android ' + BUILDSDK
      },

      // Appify android in one build, then copy the apk to each device, and run on each device
     	appify_android: {
    		options: {
    			stdout: true,
    			stderr: true,
    		},
    		command: 'appc ti build --appify --force --build-only --platform android ' + BUILDSDK
    	},
     	install_android: {
    		options: {
    			stdout: true
    		},
    		command: function (deviceserial) {
          if (deviceserial) {
          	return "adb -s " + deviceserial + " install " + ADBPARAMS + APKPATH + APKNAME;
          } else {
          	// install to all connected
            return "adb devices | tail -n +2 | cut -sf 1 | xargs -I {} adb -s {} install " + ADBPARAMS + APKPATH + APKNAME;
          }
        }
    	},

    	// Install the playstore version onto the device
      install_playstore: {
        options: {
          stdout: true
        },
        command: function (deviceserial) {
          if (deviceserial) {
             return "adb -s " + deviceserial + " install " + ADBPARAMS + ' "<%= adb_output_folder %>" ' + APKNAME;
          } else {
            // install to all connected
            return "adb devices | tail -n +2 | cut -sf 1 | xargs -I {} adb -s {} install " + ADBPARAMS +  ' <%= adb_output_folder %>/' + APKNAME;
          }
        }
      },

       run_android: {
    	  options: {
    			stdout: true
    		},
    		command: "adb devices | tail -n +2 | cut -sf 1 | xargs -I {} adb -s {} shell am start " + ACTIVITYPATH
    	},

      appify_ios: {
        options: {
          stdout: true
        },
        command: 'appc ti build --appify --force --build-only --platform ios ' + BUILDSDK
      },

      appify_ios_sim: {
        options: {
          stdout: false
        },
        command: 'appc ti build --appify --platform ios -C "4A2C385B-AEC5-44AC-B488-D84618DC23F6" ' + BUILDSDK
      },

      // Cannot avoid this "holding" the terminal, so run last or use spawn with detached
      // use timeout 5 seconds and HANGUP with SIGHUP
      // REFER to the SHELL command readme: https://github.com/sindresorhus/grunt-shell/blob/master/readme.md
    	run_ios_sim: {
    		options: {
    			stdout: false,
    			stderr: false,
    			stdio: false,
    			timeout: 45,
    			killSignal: "SIGTERM" //http://tldp.org/LDP/Bash-Beginners-Guide/html/sect_12_01.html

    		},
     		command: function (deviceserial) {
        	deviceserial = deviceserial || IPHONE6SIM;
     			if (deviceserial === 'all') {
     				deviceserial = '';
     			} else {
     				deviceserial = ' -C "' + deviceserial + '" ';
     			}
		   		return 'appc ti build --appify --platform ios ' + deviceserial + ' ' + BUILDSDK + ' >/dev/null &';
		   	}
		  },

		  run_ios_device: {
		    options: {

		    },
		    command: 'appc ti build --appify -p ios  -T device --device-id all --pp-uuid "<%= ios_dev_profile %>" --developer-name "<%= ios_dev_name %>" '  + BUILDSDK
		  },

      build_ios: {
        options: {

        },
        command: 'appc ti build -p ios  -T device --device-id all --pp-uuid "<%= ios_dev_profile %>" --developer-name "<%= ios_dev_name %>" '  + BUILDSDK
      },

      adhoc: {
      	command:function() {
	        if (true === LIVEDEV) {
                return 'appc ti build --build-only -p ios -T device --developer-name "<%= ios_adhoc_name %>" --pp-uuid "<%= ios_dev_profile %>" -O "<%= output_folder %>" ' + BUILDSDK
	        } else {
	        	return 'appc ti build -p ios -F <%= ios_family %> -T dist-adhoc -R "<%= ios_adhoc_name %>" -P "<%= ios_adhoc_profile %>" -O "<%= output_folder %>" ' + BUILDSDK
	        }
	      }
      },
      appstore: {
        command: 'appc ti build -p ios -F <%= ios_family %> -T dist-appstore -R "<%= ios_appstore_name %>" -P "<%= ios_appstore_profile %>" -O "<%= output_folder %>" ' + BUILDSDK
      },
      devandroid: {
        command: 'appc ti build --force --build-only --platform android -O "<%= adb_output_folder %>" ' + BUILDSDK
      },
      playstore: {
      	command:function() {
	        if (true === LIVEDEV) {
	        	return 'appc ti build -b -p android -T device -O "<%= adb_output_folder %>" ' + BUILDSDK
	        } else {
	        	return 'appc ti build -b -T dist-playstore -O "<%= adb_output_folder %>" -p android -K <%= android_keystore %> -P <%= android_keypass %> ' + BUILDSDK
	        }
	      }
      },

     installr_ios: { // upload iOS App to installr
      options: { stdout:true
      }, command: [
        "curl -H 'X-InstallrAppToken: <%= installr_api_key %>' https://www.installrapp.com/apps.json " +
        "-F 'qqfile=@<%= output_folder %>/<%= ipa_name %>' " +
        "-F 'releaseNotes=<%= installr_settings.releaseNotes %>' " + // release notes pulled from installr_settings above
        "-F 'notify=true'"
        ].join("&&")
      },

      installr_android: {// upload Android App to installr
        options: { stdout:true
        }, command:
        ["curl -H 'X-InstallrAppToken: <%= installr_api_key %>' https://www.installrapp.com/apps.json " +
        "-F 'qqfile=@<%= adb_output_folder %>/<%= apk_name %>' " +
        "-F 'releaseNotes=<%= installr_settings.releaseNotes %>' " +
        "-F 'notify=true'"].join("&&")
      },

      repl_file: {
        options: {
          //stdout: false,
          //stderr: false,
          //stdio: false,
        },
        command: function(filepath) {
          grunt.log.writeln('in shellrepl_file param '+ filepath);

          filepath = filepath || './repl/testrepl.js';
          return 'cat "' + filepath + '"|tishadow repl --pipe'; // ' >/dev/null &';
        },
      }

    },
    watch: {
      options: {
        nospawn: true,
        update: true,
      },
      all: {
        files: ['app/**/*.js', 'app/assets/**', 'app/lib/**', 'app/lib/specs/**', 'app/**/*.tss', 'app/**/*.xml', 'tiapp.xml'],
        tasks: ['tishadow:run_android'],
        options: {
          nospawn: true,
          event: ['added', 'changed', 'deleted'],
          debounceDelay: 500,
          interrupt: true
        },
      },
      repl: {
        files: ['repl/**/*.js'],
        //tasks: ['shell:repl_file'],
        options: {
          event: ['added', 'changed'],
          debounceDelay: 250,
       }
      }
    },
  clean: {
      project: {
        src: ['Resources/', 'build/'] // for 6to5 and Jade  ['app/controllers/', 'app/views/', 'app/styles/', 'Resources/', 'build/']
      }
  },
  concurrent: {
      options: {
        logConcurrentOutput: true,
      },
      appify: {
        tasks: ['shell:appify_android', 'shell:run_ios_device']
      },
      run: {
        tasks: ['shell:run_android', 'tishadow:run', 'watch']
      },
      spec: {
        tasks: ['tishadow:server','shell:appify', 'tishadow:spec', 'watch:views','watch:styles', 'watch:javascripts', /*'watch:assets',*/ ]
      }
  },
  });

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-available-tasks');

  // No default - will show tasks instead
  grunt.registerTask('tasks', ['availabletasks']);
  grunt.registerTask('nodefault', '');
  grunt.registerTask('compile', ['shell:clear', 'shell:compile']);
  grunt.registerTask('buildios', ['clean', 'shell:build_ios']);
  grunt.registerTask('appifyandroid', ['clean', 'shell:appify_android', 'shell:install_android', 'shell:run_android']);
  grunt.registerTask('appifyandroidlib', ['clean', 'shell:buildandroidlib', 'shell:appify_android', 'shell:install_android', 'shell:run_android']);
  grunt.registerTask('appifyandroidnorun', ['clean', 'shell:appify_android', 'shell:install_android']);
  grunt.registerTask('appifyios', ['spawnios']);
  grunt.registerTask('appifyiphone', ['shell:run_ios_device']);
  grunt.registerTask('appify', ['appifyandroid', 'shell:run_ios_device']);
  grunt.registerTask('appifysim', ['appifyandroid', 'shell:appify_ios_sim']);
  grunt.registerTask('tsrun', ['tishadow:run','watch']);
  grunt.registerTask('dev', ['clean', 'appify', 'concurrent:run']);
  grunt.registerTask('installrios', ['clean', 'updateversion', 'shell:adhoc','shell:installr_ios']);
  grunt.registerTask('installrandroid', ['clean', 'updateversion', 'shell:playstore','shell:installr_android']);
  grunt.registerTask('installr', ['clean', 'updateversion', 'shell:adhoc', 'shell:installr_ios', 'shell:playstore', 'shell:installr_android']);
  grunt.registerTask('buildplaystore', ['clean', 'updateversion', 'shell:playstore']);
  grunt.registerTask('buildappstore', ['clean', 'updateversion', 'shell:appstore']);
  grunt.registerTask('installplaystore', ['clean', 'updateversion', 'shell:playstore','shell:install_playstore']);
  grunt.registerTask('updateversion', function(forceversion) {
  	  forceversion = forceversion || '';
      var tiapp = require('tiapp.xml').load('./tiapp.xml');
      var today = new Date();
      var mm = today.getMonth()+1;
      var zmm = (mm < 10) ? '0' + mm : mm;
      var dd = today.getDate();
      (dd < 10) && (dd = '0' + dd);
      var hh = today.getHours();
      (hh < 10) && (hh = '0' + hh);
      var nn = today.getMinutes();
      (nn < 10) && (nn = '0' + nn);

      var versions = tiapp.version.split('.');
      if (forceversion !== '') {
      	versions[2] = forceversion;
      } else {
      	versions[2] = mm.toString() + dd.toString();
      }
      versions[3] = versions[0].toString() + versions[1].toString() + zmm.toString() + dd.toString() + hh.toString() + nn.toString(); // (Math.round(today.getTime() / 1000)).toString();
      tiapp.version = versions.join('.');

      var androids = tiapp.doc.documentElement.getElementsByTagName('android');
      if (androids.length === 1) {
        var manifests = androids.item(0).getElementsByTagName('manifest');

        if (manifests.length === 1) {
          var manifest = manifests.item(0);

          manifest.setAttribute('android:versionName', versions.slice(0, 3).join('.'));
          manifest.setAttribute('android:versionCode', versions[3]);
        }
      }

      tiapp.write();
      grunt.log.writeln(require('util').format('Bumped version to: %s', tiapp.version));
    });

  //only modify changed file
  grunt.event.on('watch', function(action, filepath, target) {
    var o = {};
    grunt.log.writeln(target + ': ' + filepath + ' has ' + action);
    if (target == 'repl'){
       grunt.util.spawn({
          grunt: true,
          args: ['shell:repl_file:'+filepath],
          opts: {stdio: false, stdout: false, stderr: false, detached: true}
      }, function (err, result, code) {
          if (err) throw err;
          //grunt.log.ok(String(result));
      });
      return;
    }
  });

  // Try to run "spawned" as a child process
  grunt.registerTask('spawnios', '',
        function() {
            var done = this.async();
            printArgs('parent');
            grunt.util.spawn({
                grunt: true,
                args: ['shell:run_ios_sim:'+IPHONE6SIM],
                opts: {stdio: false, stdout: false, stderr: false, detached: true}
            }, function (err, result, code) {
                if (err) throw err;
                grunt.log.ok(String(result));
                done();
            });
            process.exit(0);
        }
  );
};
