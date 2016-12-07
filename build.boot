(set-env!
   :source-paths #{"src/clj"}
   :dependencies
       '[
         ;; https://github.com/cpmcdaniel/boot-copy
         [cpmcdaniel/boot-copy "1.0" :scope "provided"]
         ;; https://github.com/dgellow/boot-files
         [dgellow/boot-files "1.0.1"]])

;; [mathias/boot-restart "0.0.2"]
;; https://github.com/mathias/boot-restart
;; to automatically restart the server when its files change.

;; https://github.com/danielsz/boot-runit
;; https://github.com/danielsz/boot-shell

(require '[cpmcdaniel.boot-copy :refer [copy]])
(require '[dgellow.boot-files :refer [move-files copy-files]])
(require '[task.copy :as mine])

(deftask update-metadata-direct []
  (comp
    (sift :include #{ #"metadata.json$"})
    (watch :verbose true)
    (copy-files :files {"ts/plugins/PushPlugin/metadata.json" "plugins/PushPlugin/metadata.json"})
    (target :no-clean true :dir #{"./client"})))

(deftask update-metadata-indirect
  "copy the files from the development directories
   into their proper places"
  []
  (comp
   (sift :include #{ #"metadata.json"})
   (watch :verbose true)
   (show :fileset true)
   (target :no-clean true :dir #{"./client"})))
