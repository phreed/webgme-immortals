(set-env!
   :source-paths #{"init"}
   :dependencies
       '[
         ;; https://github.com/cpmcdaniel/boot-copy
         [cpmcdaniel/boot-copy "1.0"]])

;; [mathias/boot-restart "0.0.2"]
;; https://github.com/mathias/boot-restart
;; to automatically restart the server when its files change.

;; https://github.com/danielsz/boot-runit
;; https://github.com/danielsz/boot-shell

(require '[cpmcdaniel.boot-copy :refer [copy]])

(deftask dev-provision
  "copy the files from the development directories
   into their proper places for testing the build"
  []
  (comp
     (copy :matching #{ #".*\.service"
                        #".*\.socket$"}
           :output-dir "/usr/local/lib/systemd/system/")))

    ; (copy :matching #{#"webgme_immortals\.env$"}
    ;       :output-dir "/etc/default/webgme/"
    ; (copy :matching #{#"webgme_immortals\.sh$"}
    ;       :output-dir "/usr/share/webgme/")))
