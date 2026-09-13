from contextlib import contextmanager
@contextmanager
def my_cm():
    print("enter")
    try:
        yield
        print("commit")
    except Exception as e:
        print("rollback")
        raise
    finally:
        print("close")

def func():
    with my_cm():
        print("inside")
        return "early"

func()
