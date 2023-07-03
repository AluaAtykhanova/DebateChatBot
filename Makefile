build:
	docker build -t botd .

run:
	docker run -d -p 3000:3000 --name botd --rm botd
