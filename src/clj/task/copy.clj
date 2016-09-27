(ns task.copy
  (:require [boot.core :as core]
            [boot.task.built-in :as task]))


(deftask copy
  "copy project "
  (let [tmp (tmp-dir!)]
    (with-pre-wrap fs
      (let [ins (->> fs
                     (input-files)
                     (by-re #{#"^public/"}))]
        (empty-dir! tmp)
        (doseq [in ins]
          (let [[path file] ((juxt tmp-path tmp-file) in)
                relpath (.replaceAll path "^public/" "")]
            (io/copy file (io/file tmp "public" tag relpath))))
        (-> fs (add-resource tmp) commit!)))))
