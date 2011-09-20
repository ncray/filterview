library(rjson)
data(mtcars)
mtcars2 <- mtcars[, 1:3]
names(mtcars2) <- c("yy", "cyl", "xx")
mtcars.json <- toJSON(as.list(mtcars2))
write(x = mtcars.json, file = "~/filterview/data/mtcars.json")

system("cd ~/filterview; node ~/filterview/server.js ~/filterview/unit/testR.html&")
browseURL(url="http://localhost:8000")


data(mtcars)
mtcars2 <- mtcars[, 1:3]
names(mtcars2) <- c("yy", "cyl", "xx")
mtcars.json <- toJSON(as.list(mtcars2))
#plotcmd <- "plot(foo.xx)"
#plotcmd <- "plot(foo.xx, foo.yy, {xlab:'cyl', ylab:'mpg'})"
plotcmd <- "plot(foo.xx, foo.yy, {col:foo.cyl})"
plotvalue <- gsub(".*\\(", "[", plotcmd)
plotvalue <- gsub(")\\s*$", "]", plotvalue)
plotcmd <- paste("\"", plotcmd, "\"", sep = "")
lines <- readLines("skeleton.js")
lines[4] <- mtcars.json
##lines[7] <- "'plot(foo.xx, foo.yy, {xlab:'cyl', ylab:'mpg', col:foo.col})': [foo.xx, foo.yy, {xlab:'cyl', ylab:'mpg', col:foo.col}]"
lines[7] <- paste(plotcmd, plotvalue, sep = ": ")
##lines[7] <- paste("\"", lines[7], sep = "")
##lines[7] <- paste(lines[7], "\"", sep = "")
writeLines(lines, "js/filterviewR.js")
browseURL(url="filterviewR.html", browser="chromium")


library(rgl)
example(rgl)

three_cluster <- data.frame(fromJSON(file = "data/three_cluster.json"))

prepareJSON <- function(df, cols = 1:ncol(df), cnames = names(df)){
  df <- df[, cols]
  names(df) <- cnames
  toJSON(as.list(df))
}
prepareJSON(mtcars, 1:3, c("yy", "cyl", "xx"))

prepareJSON <- function(df, cols = FALSE, cnames = FALSE){
  if(!cols) cols <- 1:ncol(df)
  if(!cnames) cnames <- names(df)
  df <- df[, cols]
  names(df) <- cnames
  toJSON(as.list(df))
}
prepareJSON(three_cluster)

fvplot <- function(plotcmd, JSON, browser){
  plotvalue <- gsub(".*\\(", "[", plotcmd)
  plotvalue <- gsub(")\\s*$", "]", plotvalue)
  plotcmd <- paste("\"", plotcmd, "\"", sep = "")
  lines <- readLines("skeleton.js")
  lines[4] <- JSON
  lines[7] <- paste(plotcmd, plotvalue, sep = ": ")
  writeLines(lines, "js/filterviewR.js")
  browseURL(url="filterviewR.html", browser=browser)
}

fvplot("plot(foo.xx)", prepareJSON(three_cluster), "chromium")
fvplot("plot(foo.xx, foo.yy)", prepareJSON(three_cluster), "chromium")
fvplot("plot(foo.xx, foo.yy, {col:foo.col})", prepareJSON(three_cluster), "chromium")
fvplot("plot(foo.xx, foo.yy, {col:foo.col, bar:foo.tt, ui:{slider:'bar'}})", prepareJSON(three_cluster), "chromium")
fvplot("plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{checkbox:'tt', autocomplete:'col'}})", prepareJSON(three_cluster), "chromium")
fvplot("plot(foo.xx, foo.yy, {col:foo.col, tt:foo.tt, ui:{slider:['xx', 'yy']}})", prepareJSON(three_cluster), "chromium")
